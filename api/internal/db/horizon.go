// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// HorizonEntry is a game on a player's Horizon — a game they intend to play
// in the future.
type HorizonEntry struct {
	IGDBID      int
	Name        string
	CoverURL    *string
	Genres      []string
	ReleaseYear *int
	AddedAt     time.Time
}

// AddHorizonEntry adds a game to playerID's Horizon. It is idempotent —
// added is false if the entry already existed.
func AddHorizonEntry(ctx context.Context, pool *pgxpool.Pool, playerID string, igdbID int) (bool, error) {
	tag, err := pool.Exec(ctx, `
		INSERT INTO horizon_entries (player_id, igdb_id)
		VALUES ($1, $2)
		ON CONFLICT (player_id, igdb_id) DO NOTHING
	`, playerID, igdbID)
	if err != nil {
		return false, fmt.Errorf("add horizon entry: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

// RemoveHorizonEntry removes a game from playerID's Horizon.
func RemoveHorizonEntry(ctx context.Context, pool *pgxpool.Pool, playerID string, igdbID int) error {
	_, err := pool.Exec(ctx, `
		DELETE FROM horizon_entries WHERE player_id = $1 AND igdb_id = $2
	`, playerID, igdbID)
	if err != nil {
		return fmt.Errorf("remove horizon entry: %w", err)
	}
	return nil
}

// ListHorizonEntries returns playerID's Horizon, most recently added first.
func ListHorizonEntries(ctx context.Context, pool *pgxpool.Pool, playerID string) ([]HorizonEntry, error) {
	rows, err := pool.Query(ctx, `
		SELECT g.igdb_id, g.name, g.cover_url, g.genres, g.release_year, h.added_at
		FROM horizon_entries h
		JOIN igdb_games g ON g.igdb_id = h.igdb_id
		WHERE h.player_id = $1
		ORDER BY h.added_at DESC
	`, playerID)
	if err != nil {
		return nil, fmt.Errorf("list horizon entries: %w", err)
	}
	defer rows.Close()

	var entries []HorizonEntry
	for rows.Next() {
		var e HorizonEntry
		if err := rows.Scan(&e.IGDBID, &e.Name, &e.CoverURL, &e.Genres, &e.ReleaseYear, &e.AddedAt); err != nil {
			return nil, fmt.Errorf("scan horizon entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// IsInHorizon reports whether playerID has igdbID on their Horizon.
func IsInHorizon(ctx context.Context, pool *pgxpool.Pool, playerID string, igdbID int) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM horizon_entries WHERE player_id = $1 AND igdb_id = $2)
	`, playerID, igdbID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("is in horizon: %w", err)
	}
	return exists, nil
}
