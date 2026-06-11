// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

//go:build integration

package db_test

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/juan-medina/yurnik/internal/db"
)

func insertTestGame(t *testing.T, pool *pgxpool.Pool, igdbID int, name string) {
	t.Helper()
	ctx := context.Background()
	if _, err := pool.Exec(ctx, `
		INSERT INTO igdb_games (igdb_id, name) VALUES ($1, $2)
		ON CONFLICT (igdb_id) DO NOTHING
	`, igdbID, name); err != nil {
		t.Fatalf("insert igdb_games: %v", err)
	}
	t.Cleanup(func() { pool.Exec(ctx, "DELETE FROM igdb_games WHERE igdb_id = $1", igdbID) })
}

func TestAddHorizonEntry_IsIdempotent(t *testing.T) {
	pool := connectTestDB(t)
	ctx := context.Background()
	playerID := createTestUser(t, pool)
	insertTestGame(t, pool, 91001, "Test Game")

	added, err := db.AddHorizonEntry(ctx, pool, playerID, 91001)
	if err != nil {
		t.Fatalf("add horizon entry: %v", err)
	}
	if !added {
		t.Errorf("expected first add to report added=true")
	}

	added, err = db.AddHorizonEntry(ctx, pool, playerID, 91001)
	if err != nil {
		t.Fatalf("add horizon entry again: %v", err)
	}
	if added {
		t.Errorf("expected second add to report added=false")
	}
}

func TestRemoveHorizonEntry(t *testing.T) {
	pool := connectTestDB(t)
	ctx := context.Background()
	playerID := createTestUser(t, pool)
	insertTestGame(t, pool, 91002, "Test Game 2")

	if _, err := db.AddHorizonEntry(ctx, pool, playerID, 91002); err != nil {
		t.Fatalf("add horizon entry: %v", err)
	}
	if err := db.RemoveHorizonEntry(ctx, pool, playerID, 91002); err != nil {
		t.Fatalf("remove horizon entry: %v", err)
	}

	entries, err := db.ListHorizonEntries(ctx, pool, playerID)
	if err != nil {
		t.Fatalf("list horizon entries: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected 0 entries after removal, got %d", len(entries))
	}
}

func TestListHorizonEntries_OrderedByAddedAtDesc(t *testing.T) {
	pool := connectTestDB(t)
	ctx := context.Background()
	playerID := createTestUser(t, pool)
	insertTestGame(t, pool, 91003, "Older Game")
	insertTestGame(t, pool, 91004, "Newer Game")

	if _, err := db.AddHorizonEntry(ctx, pool, playerID, 91003); err != nil {
		t.Fatalf("add horizon entry 1: %v", err)
	}
	if _, err := db.AddHorizonEntry(ctx, pool, playerID, 91004); err != nil {
		t.Fatalf("add horizon entry 2: %v", err)
	}

	entries, err := db.ListHorizonEntries(ctx, pool, playerID)
	if err != nil {
		t.Fatalf("list horizon entries: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].IGDBID != 91004 || entries[1].IGDBID != 91003 {
		t.Errorf("expected entries in added_at DESC order, got %d, %d", entries[0].IGDBID, entries[1].IGDBID)
	}
}

func TestIsInHorizon(t *testing.T) {
	pool := connectTestDB(t)
	ctx := context.Background()
	playerID := createTestUser(t, pool)
	insertTestGame(t, pool, 91005, "Maybe Game")

	in, err := db.IsInHorizon(ctx, pool, playerID, 91005)
	if err != nil {
		t.Fatalf("is in horizon: %v", err)
	}
	if in {
		t.Errorf("expected not in horizon before add")
	}

	if _, err := db.AddHorizonEntry(ctx, pool, playerID, 91005); err != nil {
		t.Fatalf("add horizon entry: %v", err)
	}

	in, err = db.IsInHorizon(ctx, pool, playerID, 91005)
	if err != nil {
		t.Fatalf("is in horizon after add: %v", err)
	}
	if !in {
		t.Errorf("expected in horizon after add")
	}
}

func TestRecordHorizonAdd_RoundTrip(t *testing.T) {
	pool := connectTestDB(t)
	ctx := context.Background()
	playerID := createTestUser(t, pool)
	insertTestGame(t, pool, 91006, "Horizon Game")

	if err := db.RecordHorizonAdd(ctx, pool, playerID, 91006, "Horizon Game"); err != nil {
		t.Fatalf("record horizon add: %v", err)
	}

	events, err := db.GetUserActivity(ctx, pool, playerID, 10, "")
	if err != nil {
		t.Fatalf("get user activity: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	e := events[0]
	if e.Type != "horizon_add" {
		t.Errorf("expected type horizon_add, got %s", e.Type)
	}
	if e.ActorID != playerID || e.RecipientID != playerID {
		t.Errorf("expected self-directed event, got actor %s, recipient %s", e.ActorID, e.RecipientID)
	}
	if e.SubjectIGDBID == nil || *e.SubjectIGDBID != 91006 {
		t.Errorf("expected subject igdb id 91006, got %v", e.SubjectIGDBID)
	}
	if e.SubjectTitle == nil || *e.SubjectTitle != "Horizon Game" {
		t.Errorf("expected subject title 'Horizon Game', got %v", e.SubjectTitle)
	}
}
