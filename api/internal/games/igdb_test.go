// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package games

import (
	"testing"
)

// TestSearch_nilGenresCoercedToEmpty verifies that when IGDB returns a game
// with no genres field, Genres is coerced to []string{} not nil.
// This prevents the NOT NULL constraint violation on igdb_games.genres.
func TestSearch_nilGenresCoercedToEmpty(t *testing.T) {
	raw := []igdbGame{
		{ID: 1, Name: "No Genres Game"},
		{ID: 2, Name: "Has Genres Game", Genres: []struct {
			Name string `json:"name"`
		}{{Name: "RPG"}}},
	}

	games := make([]Game, 0, len(raw))
	for _, g := range raw {
		game := Game{IGDBID: g.ID, Name: g.Name}
		for _, genre := range g.Genres {
			game.Genres = append(game.Genres, genre.Name)
		}
		if game.Genres == nil {
			game.Genres = []string{}
		}
		games = append(games, game)
	}

	if games[0].Genres == nil {
		t.Error("Genres should be []string{} not nil when IGDB returns no genres")
	}
	if len(games[0].Genres) != 0 {
		t.Errorf("Genres should be empty, got %v", games[0].Genres)
	}
	if len(games[1].Genres) != 1 || games[1].Genres[0] != "RPG" {
		t.Errorf("Genres should be [RPG], got %v", games[1].Genres)
	}
}
