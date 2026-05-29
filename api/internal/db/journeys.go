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
	UserID        string
	Status        string
	IGDBID        *int
	ExeName       *string
	WindowTitle   *string
	StartedAt     time.Time
	EndedAt       *time.Time
	LastHeartbeat time.Time
}

// GetPendingJourney returns a single pending journey by ID and user ID.
// Returns an error if it does not exist or does not belong to the given user.
func GetPendingJourney(ctx context.Context, pool *pgxpool.Pool, id, userID string) (PendingJourney, error) {
	var p PendingJourney
	err := pool.QueryRow(ctx, `
		SELECT id, user_id, status, igdb_id, exe_name, window_title, started_at, ended_at, last_heartbeat
		FROM pending_journeys
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(
		&p.ID, &p.UserID, &p.Status, &p.IGDBID,
		&p.ExeName, &p.WindowTitle,
		&p.StartedAt, &p.EndedAt, &p.LastHeartbeat,
	)
	if err == pgx.ErrNoRows {
		return PendingJourney{}, fmt.Errorf("pending journey not found: %s", id)
	}
	return p, err
}

// DeletePendingJourney removes a pending journey row. Used on confirm or discard.
func DeletePendingJourney(ctx context.Context, pool *pgxpool.Pool, id, userID string) error {
	tag, err := pool.Exec(ctx, `
		DELETE FROM pending_journeys WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("pending journey not found: %s", id)
	}
	return nil
}

// ListPendingJourneys returns all pending journeys for the given user with
// status 'active' or 'ended', ordered by created_at descending.
func ListPendingJourneys(ctx context.Context, pool *pgxpool.Pool, userID string) ([]PendingJourney, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, user_id, status, igdb_id, exe_name, window_title, started_at, ended_at, last_heartbeat
		FROM pending_journeys
		WHERE user_id = $1 AND status IN ('active', 'ended')
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var journeys []PendingJourney
	for rows.Next() {
		var p PendingJourney
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.Status, &p.IGDBID,
			&p.ExeName, &p.WindowTitle,
			&p.StartedAt, &p.EndedAt, &p.LastHeartbeat,
		); err != nil {
			return nil, err
		}
		journeys = append(journeys, p)
	}
	return journeys, rows.Err()
}

// Journey is a confirmed journey row.
type Journey struct {
	ID              string
	UserID          string
	IGDBID          int
	StartedAt       time.Time
	EndedAt         time.Time
	DurationSeconds int
	Log             *string
	PlayedAt        time.Time
	CreatedAt       time.Time
}

// InsertJourney writes a confirmed journey row and returns the new ID.
func InsertJourney(ctx context.Context, pool *pgxpool.Pool, j Journey) (string, error) {
	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO journeys (user_id, igdb_id, started_at, ended_at, duration_seconds, log, played_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, j.UserID, j.IGDBID, j.StartedAt, j.EndedAt, j.DurationSeconds, j.Log, j.PlayedAt).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("insert journey: %w", err)
	}
	return id, nil
}

// DeleteJourney removes a confirmed journey by ID and user ID.
func DeleteJourney(ctx context.Context, pool *pgxpool.Pool, id, userID string) error {
	tag, err := pool.Exec(ctx, `
		DELETE FROM journeys WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("journey not found: %s", id)
	}
	return nil
}

// ListJourneysByUser returns confirmed journeys for the given user ID,
// ordered by played_at descending, with optional cursor-based pagination.
func ListJourneysByUser(ctx context.Context, pool *pgxpool.Pool, userID string, limit int, cursor string) ([]Journey, error) {
	var rows pgx.Rows
	var err error

	if cursor == "" {
		rows, err = pool.Query(ctx, `
			SELECT id, user_id, igdb_id, started_at, ended_at, duration_seconds, log, played_at, created_at
			FROM journeys
			WHERE user_id = $1
			ORDER BY played_at DESC
			LIMIT $2
		`, userID, limit)
	} else {
		rows, err = pool.Query(ctx, `
			SELECT id, user_id, igdb_id, started_at, ended_at, duration_seconds, log, played_at, created_at
			FROM journeys
			WHERE user_id = $1 AND played_at < $2
			ORDER BY played_at DESC
			LIMIT $3
		`, userID, cursor, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var journeys []Journey
	for rows.Next() {
		var j Journey
		if err := rows.Scan(
			&j.ID, &j.UserID, &j.IGDBID,
			&j.StartedAt, &j.EndedAt, &j.DurationSeconds,
			&j.Log, &j.PlayedAt, &j.CreatedAt,
		); err != nil {
			return nil, err
		}
		journeys = append(journeys, j)
	}
	return journeys, rows.Err()
}
