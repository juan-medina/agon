// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package middleware

import (
	"net/http"

	"golang.org/x/time/rate"
)

// RateLimit returns a middleware that limits inbound requests to rps requests per second.
// Burst is set equal to rps so short bursts up to the per-second limit are allowed.
// Requests that exceed the limit receive 429 Too Many Requests immediately.
func RateLimit(rps float64, next http.Handler) http.Handler {
	limiter := rate.NewLimiter(rate.Limit(rps), int(rps))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !limiter.Allow() {
			w.Header().Set("Retry-After", "1")
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
