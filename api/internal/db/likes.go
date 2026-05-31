// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// LikePlayer is a user who has liked a journey.
type LikePlayer struct {
	UserID    string
	Handle    string
	Name      string
	AvatarURL *string
	Color     string
}

// InsertLike records that userID liked journeyID. Idempotent — duplicate likes are ignored.
func InsertLike(ctx context.Context, pool *pgxpool.Pool, journeyID, userID string) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO likes (journey_id, user_id) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, journeyID, userID)
	return err
}

// DeleteLike removes userID's like from journeyID. Returns an error if no row was deleted.
func DeleteLike(ctx context.Context, pool *pgxpool.Pool, journeyID, userID string) error {
	tag, err := pool.Exec(ctx, `
		DELETE FROM likes WHERE journey_id = $1 AND user_id = $2
	`, journeyID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("like not found for journey %s by user %s", journeyID, userID)
	}
	return nil
}

// ListLikers returns the players who have liked the given journey, ordered by created_at ascending.
func ListLikers(ctx context.Context, pool *pgxpool.Pool, journeyID string) ([]LikePlayer, error) {
	rows, err := pool.Query(ctx, `
		SELECT u.id, u.handle, u.name, u.avatar_url, u.color
		FROM likes l
		JOIN users u ON u.id = l.user_id
		WHERE l.journey_id = $1
		ORDER BY l.created_at ASC
	`, journeyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var likers []LikePlayer
	for rows.Next() {
		var p LikePlayer
		if err := rows.Scan(&p.UserID, &p.Handle, &p.Name, &p.AvatarURL, &p.Color); err != nil {
			return nil, err
		}
		likers = append(likers, p)
	}
	return likers, rows.Err()
}
