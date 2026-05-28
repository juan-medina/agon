// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

// Package journeys handles journey confirmation and deletion.
// It coordinates between Postgres (pending_journeys, journeys_index) and the
// AT Proto PDS, always writing to AT Proto first and updating Postgres only on
// success so that a failed publish is retryable.
package journeys

import (
	"crypto/ed25519"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/juan-medina/agon/internal/atproto"
	"github.com/juan-medina/agon/internal/auth"
	"github.com/juan-medina/agon/internal/db"
)

// Handler handles journey confirmation and deletion.
type Handler struct {
	pool    *pgxpool.Pool
	atp     *atproto.Client
	jwtPriv ed25519.PrivateKey
}

// NewHandler returns a Handler. pds is the PDS base URL — pass empty string for
// the default (https://bsky.social).
func NewHandler(pool *pgxpool.Pool, jwtPriv ed25519.PrivateKey, pds string) *Handler {
	return &Handler{
		pool:    pool,
		atp:     atproto.New(pds, nil),
		jwtPriv: jwtPriv,
	}
}

// Register mounts journey routes on mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/pending-journeys/{id}/confirm", h.confirm)
	mux.HandleFunc("POST /api/pending-journeys/{id}/discard", h.discard)
	mux.HandleFunc("DELETE /api/journeys/{id}", h.delete)
}

func (h *Handler) authenticate(w http.ResponseWriter, r *http.Request) (string, bool) {
	cookie, err := r.Cookie("agon_session")
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return "", false
	}
	did, err := auth.ParseAndRenewSession(w, cookie.Value, h.jwtPriv)
	if err != nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return "", false
	}
	return did, true
}

// journeyRecord is the AT Proto record body for app.agon.journey.
type journeyRecord struct {
	Type            string   `json:"$type"`
	IGDBID          int      `json:"igdbId"`
	GameTitle       string   `json:"gameTitle"`
	CoverURL        *string  `json:"coverUrl,omitempty"`
	Genres          []string `json:"genres"`
	DurationSeconds int      `json:"durationSeconds"`
	StartedAt       string   `json:"startedAt"`
	EndedAt         string   `json:"endedAt"`
	Log             *string  `json:"log,omitempty"`
}

// confirmRequest is the JSON body for POST /api/pending-journeys/:id/confirm.
type confirmRequest struct {
	IGDBID int     `json:"igdb_id"`
	Log    *string `json:"log"`
}

// confirm publishes a pending journey to AT Proto and writes the index row.
// The pending row is deleted only after a successful AT Proto write.
func (h *Handler) confirm(w http.ResponseWriter, r *http.Request) {
	did, ok := h.authenticate(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")

	var req confirmRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid_request"}`, http.StatusBadRequest)
		return
	}
	if req.IGDBID == 0 {
		http.Error(w, `{"error":"invalid_request","message":"igdb_id is required"}`, http.StatusBadRequest)
		return
	}

	pending, err := db.GetPendingJourney(r.Context(), h.pool, id, did)
	if err != nil {
		http.Error(w, `{"error":"not_found"}`, http.StatusNotFound)
		return
	}

	// Fetch the game from the IGDB cache for denormalised fields.
	// The game must already be cached — the frontend searches games via
	// GET /api/games/search before reaching confirmation, which populates
	// the cache.
	game, err := db.GetGame(r.Context(), h.pool, req.IGDBID)
	if err != nil {
		log.Printf("journeys/confirm: get game %d: %v", req.IGDBID, err)
		http.Error(w, `{"error":"not_found","message":"game not found in cache — search for it first"}`, http.StatusNotFound)
		return
	}

	tokens, err := db.GetTokens(r.Context(), h.pool, did)
	if err != nil {
		log.Printf("journeys/confirm: get tokens for %s: %v", did, err)
		http.Error(w, `{"error":"internal_error"}`, http.StatusInternalServerError)
		return
	}

	endedAt := time.Now().UTC()
	if pending.EndedAt != nil {
		endedAt = *pending.EndedAt
	}

	var durationSeconds int
	if pending.EndedAt != nil {
		durationSeconds = int(pending.EndedAt.Sub(pending.StartedAt).Seconds())
	}

	rec := journeyRecord{
		Type:            "app.agon.journey",
		IGDBID:          game.IGDBID,
		GameTitle:       game.Name,
		Genres:          game.Genres,
		DurationSeconds: durationSeconds,
		StartedAt:       pending.StartedAt.UTC().Format(time.RFC3339),
		EndedAt:         endedAt.UTC().Format(time.RFC3339),
		Log:             req.Log,
	}
	if game.CoverURL != "" {
		rec.CoverURL = &game.CoverURL
	}

	// Write to AT Proto first. If this fails the pending row stays so the
	// user can retry.
	result, err := h.atp.CreateRecord(r.Context(), tokens.AccessToken, atproto.Record{
		Collection: "app.agon.journey",
		Repo:       did,
		Record:     rec,
	})
	if err != nil {
		log.Printf("journeys/confirm: create AT Proto record for %s: %v", did, err)
		http.Error(w, `{"error":"internal_error","message":"failed to publish journey"}`, http.StatusInternalServerError)
		return
	}

	// AT Proto write succeeded. Update Postgres.
	if err := db.InsertJourneyIndex(r.Context(), h.pool, db.IndexedJourney{
		JourneyURI: result.URI,
		IGDBID:     game.IGDBID,
		UserDID:    did,
		PlayedAt:   endedAt,
	}); err != nil {
		// Index write failed but the AT Proto record exists. Log and continue —
		// the record is on the PDS and the index can be rebuilt.
		log.Printf("journeys/confirm: insert index for %s uri=%s: %v", did, result.URI, err)
	}

	if err := db.DeletePendingJourney(r.Context(), h.pool, id, did); err != nil {
		// Pending row deletion failed but the journey is published. Log and
		// continue — the pending row will be evicted by pg_cron after 7 days.
		log.Printf("journeys/confirm: delete pending %s: %v", id, err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"journey_uri": result.URI,
		"cid":         result.CID,
	})
}

// discard removes a pending journey with no AT Proto action.
func (h *Handler) discard(w http.ResponseWriter, r *http.Request) {
	did, ok := h.authenticate(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")

	if err := db.DeletePendingJourney(r.Context(), h.pool, id, did); err != nil {
		http.Error(w, `{"error":"not_found"}`, http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// delete removes a confirmed journey from AT Proto and from journeys_index.
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	did, ok := h.authenticate(w, r)
	if !ok {
		return
	}

	rkey := r.PathValue("id")

	journeyURI, err := db.GetJourneyURI(r.Context(), h.pool, rkey, did)
	if err != nil {
		http.Error(w, `{"error":"not_found"}`, http.StatusNotFound)
		return
	}

	tokens, err := db.GetTokens(r.Context(), h.pool, did)
	if err != nil {
		log.Printf("journeys/delete: get tokens for %s: %v", did, err)
		http.Error(w, `{"error":"internal_error"}`, http.StatusInternalServerError)
		return
	}

	// Delete from AT Proto first.
	if err := h.atp.DeleteRecord(r.Context(), tokens.AccessToken, journeyURI); err != nil {
		log.Printf("journeys/delete: delete AT Proto record %s: %v", journeyURI, err)
		http.Error(w, `{"error":"internal_error","message":"failed to delete journey from PDS"}`, http.StatusInternalServerError)
		return
	}

	// AT Proto delete succeeded. Remove from index.
	if err := db.DeleteJourneyIndex(r.Context(), h.pool, journeyURI, did); err != nil {
		log.Printf("journeys/delete: delete index %s: %v", journeyURI, err)
	}

	w.WriteHeader(http.StatusNoContent)
}
