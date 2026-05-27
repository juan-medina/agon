// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Game, GameActivity } from "@/models/game";
import { GAME_LIBRARY, MOCK_GAME_ACTIVITY } from "@/lib/mock";
import { API_BASE } from "@/lib/api";

const _library: Game[] = [...GAME_LIBRARY];
const _activity: GameActivity[] = [...MOCK_GAME_ACTIVITY];

export async function getGameLibrary(): Promise<Game[]> {
  return [..._library];
}

export async function searchGames(query: string): Promise<Game[]> {
  if (query.length < 2) return [];
  try {
    const resp = await fetch(`${API_BASE}/api/games/search?q=${encodeURIComponent(query)}`, {
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`game search failed: ${resp.status}`);
    const raw: { id: string; name: string; cover_url?: string; genres: string[] }[] = await resp.json();
    return raw.map((g) => ({
      id: g.id,
      game: g.name,
      coverUrl: g.cover_url,
      genres: g.genres ?? [],
    }));
  } catch {
    return _library.filter((g) => g.game.toLowerCase().includes(query.toLowerCase()));
  }
}

export async function getGameActivity(): Promise<GameActivity[]> {
  return [..._activity];
}
