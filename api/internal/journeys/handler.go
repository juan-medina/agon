// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

// Package journeys handles journey confirmation and deletion.
package journeys

import (
	"crypto/ed25519"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/juan-medina/agon/internal/auth"
)

// Handler handles journey routes.
type Handler struct {
	pool    *pgxpool.Pool
	jwtPriv ed25519.PrivateKey
}

// NewHandler returns a Handler.
func NewHandler(pool *pgxpool.Pool, jwtPriv ed25519.PrivateKey) *Handler {
	return &Handler{pool: pool, jwtPriv: jwtPriv}
}

// Register mounts journey routes on mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/journeys", h.add)
	mux.HandleFunc("POST /api/pending-journeys/{id}/confirm", h.confirm)
	mux.HandleFunc("POST /api/pending-journeys/{id}/discard", h.discard)
	mux.HandleFunc("DELETE /api/journeys/{id}", h.delete)
	mux.HandleFunc("GET /api/pending-journeys", h.listPending)
	mux.HandleFunc("GET /api/players/{handle}/journeys", h.listByPlayer)
	mux.HandleFunc("POST /api/pending-journeys/{id}/exclude", h.exclude)
}

func (h *Handler) authenticate(w http.ResponseWriter, r *http.Request) (string, bool) {
	cookie, err := r.Cookie("agon_session")
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return "", false
	}
	userID, err := auth.ParseAndRenewSession(w, cookie.Value, h.jwtPriv)
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return "", false
	}
	return userID, true
}

func (h *Handler) add(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authenticate(w, r); !ok {
		return
	}
	http.Error(w, `{"error":"not_implemented"}`, http.StatusNotImplemented)
}

func (h *Handler) confirm(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authenticate(w, r); !ok {
		return
	}
	http.Error(w, `{"error":"not_implemented"}`, http.StatusNotImplemented)
}

func (h *Handler) discard(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authenticate(w, r); !ok {
		return
	}
	http.Error(w, `{"error":"not_implemented"}`, http.StatusNotImplemented)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authenticate(w, r); !ok {
		return
	}
	http.Error(w, `{"error":"not_implemented"}`, http.StatusNotImplemented)
}

func (h *Handler) listPending(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authenticate(w, r); !ok {
		return
	}
	http.Error(w, `{"error":"not_implemented"}`, http.StatusNotImplemented)
}

func (h *Handler) listByPlayer(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authenticate(w, r); !ok {
		return
	}
	http.Error(w, `{"error":"not_implemented"}`, http.StatusNotImplemented)
}

func (h *Handler) exclude(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authenticate(w, r); !ok {
		return
	}
	http.Error(w, `{"error":"not_implemented"}`, http.StatusNotImplemented)
}
