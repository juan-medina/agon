// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/juan-medina/yurnik/internal/middleware"
)

func TestRateLimit_AllowsRequestUnderLimit(t *testing.T) {
	handler := middleware.RateLimit(10, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestRateLimit_Returns429WhenExceeded(t *testing.T) {
	// Limiter of 1 rps with burst 1 — second request must be rejected.
	handler := middleware.RateLimit(1, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)

	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req)

	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req)

	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec2.Code)
	}
}

func TestRateLimit_429IncludesRetryAfterHeader(t *testing.T) {
	handler := middleware.RateLimit(1, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(httptest.NewRecorder(), req) // consume the burst

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Result().Header.Get("Retry-After") == "" {
		t.Fatal("expected Retry-After header on 429 response")
	}
}
