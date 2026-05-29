// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package journeys

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAdd_unauthenticated(t *testing.T) {
	h := &Handler{}
	mux := http.NewServeMux()
	h.Register(mux)

	r := httptest.NewRequest(http.MethodPost, "/api/players/me/journeys",
		strings.NewReader(`{"igdb_id":1,"started_at":"2026-05-23T10:00:00Z","ended_at":"2026-05-23T13:00:00Z"}`))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestDiscard_unauthenticated(t *testing.T) {
	h := &Handler{}
	mux := http.NewServeMux()
	h.Register(mux)

	r := httptest.NewRequest(http.MethodPost, "/api/players/me/journeys/pending/some-id/discard", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestConfirm_unauthenticated(t *testing.T) {
	h := &Handler{}
	mux := http.NewServeMux()
	h.Register(mux)

	r := httptest.NewRequest(http.MethodPost, "/api/players/me/journeys/pending/some-id/confirm",
		strings.NewReader(`{"igdb_id":1}`))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestDelete_unauthenticated(t *testing.T) {
	h := &Handler{}
	mux := http.NewServeMux()
	h.Register(mux)

	r := httptest.NewRequest(http.MethodDelete, "/api/players/me/journeys/some-id", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestListPending_unauthenticated(t *testing.T) {
	h := &Handler{}
	mux := http.NewServeMux()
	h.Register(mux)

	r := httptest.NewRequest(http.MethodGet, "/api/players/me/journeys/pending", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestListMine_unauthenticated(t *testing.T) {
	h := &Handler{}
	mux := http.NewServeMux()
	h.Register(mux)

	r := httptest.NewRequest(http.MethodGet, "/api/players/me/journeys", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestExclude_unauthenticated(t *testing.T) {
	h := &Handler{}
	mux := http.NewServeMux()
	h.Register(mux)

	r := httptest.NewRequest(http.MethodPost, "/api/players/me/journeys/pending/some-id/exclude", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}
