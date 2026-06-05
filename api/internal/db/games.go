// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CachedGame struct {
	IGDBID      int
	Name        string
	CoverURL    string // empty string means no cover
	Genres      []string
	ReleaseYear *int
	Category    *int
}

// GetGame returns a cached game by IGDB ID.
// Returns an error if the game is not in the cache — the caller should ensure
// the game is cached via the IGDB search endpoint before calling confirm.
func GetGame(ctx context.Context, pool *pgxpool.Pool, igdbID int) (CachedGame, error) {
	var g CachedGame
	var coverURL *string
	err := pool.QueryRow(ctx, `
		SELECT igdb_id, name, cover_url, genres, release_year, category
		FROM igdb_games
		WHERE igdb_id = $1
	`, igdbID).Scan(&g.IGDBID, &g.Name, &coverURL, &g.Genres, &g.ReleaseYear, &g.Category)
	if err == pgx.ErrNoRows {
		return CachedGame{}, fmt.Errorf("game not in cache: %d", igdbID)
	}
	if err != nil {
		return CachedGame{}, err
	}
	if coverURL != nil {
		g.CoverURL = *coverURL
	}
	return g, nil
}

// StaleGameIDs returns IGDB IDs of cached games that are missing release_year or category.
func StaleGameIDs(ctx context.Context, pool *pgxpool.Pool) ([]int, error) {
	rows, err := pool.Query(ctx, `
		SELECT igdb_id FROM igdb_games
		WHERE release_year IS NULL OR category IS NULL
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// UpdateGameMeta writes release_year and category for a single cached game.
func UpdateGameMeta(ctx context.Context, pool *pgxpool.Pool, igdbID int, releaseYear *int, category *int) error {
	_, err := pool.Exec(ctx, `
		UPDATE igdb_games
		SET release_year = $1, category = $2
		WHERE igdb_id = $3
	`, releaseYear, category, igdbID)
	return err
}

func UpsertGame(ctx context.Context, pool *pgxpool.Pool, g CachedGame) error {
	var coverURL *string
	if g.CoverURL != "" {
		coverURL = &g.CoverURL
	}
	_, err := pool.Exec(ctx, `
		INSERT INTO igdb_games (igdb_id, name, cover_url, genres, release_year, category, cached_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
		ON CONFLICT (igdb_id) DO UPDATE
		  SET name         = EXCLUDED.name,
		      cover_url    = EXCLUDED.cover_url,
		      genres       = EXCLUDED.genres,
		      release_year = EXCLUDED.release_year,
		      category     = EXCLUDED.category,
		      cached_at    = now()
	`, g.IGDBID, g.Name, coverURL, g.Genres, g.ReleaseYear, g.Category)
	return err
}
