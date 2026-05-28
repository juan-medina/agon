// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PendingJourney is a row from the pending_journeys table.
type PendingJourney struct {
	ID            string
	DID           string
	Status        string
	IGDBID        *int
	ExeName       *string
	WindowTitle   *string
	StartedAt     time.Time
	EndedAt       *time.Time
	LastHeartbeat time.Time
}

// GetPendingJourney returns a single pending journey by ID and DID.
// Returns an error if it does not exist or does not belong to the given DID.
func GetPendingJourney(ctx context.Context, pool *pgxpool.Pool, id, did string) (PendingJourney, error) {
	var p PendingJourney
	err := pool.QueryRow(ctx, `
		SELECT id, did, status, igdb_id, exe_name, window_title, started_at, ended_at, last_heartbeat
		FROM pending_journeys
		WHERE id = $1 AND did = $2
	`, id, did).Scan(
		&p.ID, &p.DID, &p.Status, &p.IGDBID,
		&p.ExeName, &p.WindowTitle,
		&p.StartedAt, &p.EndedAt, &p.LastHeartbeat,
	)
	if err == pgx.ErrNoRows {
		return PendingJourney{}, fmt.Errorf("pending journey not found: %s", id)
	}
	return p, err
}

// DeletePendingJourney removes a pending journey row. Used after a successful
// AT Proto publish (confirm) or on discard.
func DeletePendingJourney(ctx context.Context, pool *pgxpool.Pool, id, did string) error {
	tag, err := pool.Exec(ctx, `
		DELETE FROM pending_journeys WHERE id = $1 AND did = $2
	`, id, did)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("pending journey not found: %s", id)
	}
	return nil
}

// IndexedJourney is the data written to journeys_index on confirm.
type IndexedJourney struct {
	JourneyURI string
	IGDBID     int
	UserDID    string
	PlayedAt   time.Time
}

// InsertJourneyIndex writes a row to journeys_index. Called after a successful
// AT Proto publish.
func InsertJourneyIndex(ctx context.Context, pool *pgxpool.Pool, j IndexedJourney) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO journeys_index (journey_uri, igdb_id, user_did, played_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (journey_uri) DO NOTHING
	`, j.JourneyURI, j.IGDBID, j.UserDID, j.PlayedAt)
	return err
}

// DeleteJourneyIndex removes a row from journeys_index by AT URI.
func DeleteJourneyIndex(ctx context.Context, pool *pgxpool.Pool, journeyURI, userDID string) error {
	tag, err := pool.Exec(ctx, `
		DELETE FROM journeys_index WHERE journey_uri = $1 AND user_did = $2
	`, journeyURI, userDID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("journey not found in index: %s", journeyURI)
	}
	return nil
}

// GetJourneyURI returns the AT URI for a journey owned by the given DID.
// The rkey is the last segment of the AT URI and is used as the public journey ID.
func GetJourneyURI(ctx context.Context, pool *pgxpool.Pool, rkey, userDID string) (string, error) {
	var uri string
	err := pool.QueryRow(ctx, `
		SELECT journey_uri FROM journeys_index
		WHERE journey_uri LIKE $1 AND user_did = $2
	`, "%/"+rkey, userDID).Scan(&uri)
	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("journey not found: %s", rkey)
	}
	return uri, err
}
