// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { beforeEach, afterEach, vi } from "vitest";
import {
  MY_PLAYER,
  MY_FOLLOWING,
  PLAYERS,
  JOURNEYS,
  MOCK_GAME_ACTIVITY,
  MOCK_FOLLOW_LISTS,
} from "@/lib/mock";
import type { Player } from "@/models/player";

const playerMap = new Map<string, Player>();
for (const p of PLAYERS) playerMap.set(p.id, p);
for (const j of JOURNEYS) {
  if (!playerMap.has(j.player.id)) playerMap.set(j.player.id, j.player);
}
const ALL_PLAYERS = Array.from(playerMap.values());

function toRawPlayer(p: Player) {
  return {
    id: p.id,
    handle: p.handle,
    name: p.name,
    avatar_url: p.avatarUrl ?? null,
    bio: p.bio ?? null,
    color: p.color,
    followers: p.followers ?? 0,
    following: p.following ?? 0,
  };
}

function makeDefaultFetch() {
  // Mutable follow state for this test. Initially set from MY_FOLLOWING.
  const followState: Record<string, boolean> = {};
  for (const p of MY_FOLLOWING) followState[p.id] = true;

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const method = (init?.method ?? "GET").toUpperCase();

    // GET /api/me
    if (url.includes("/api/me") && method === "GET") {
      return new Response(
        JSON.stringify({
          id: MY_PLAYER.id,
          name: MY_PLAYER.name,
          handle: MY_PLAYER.handle,
          avatar_url: MY_PLAYER.avatarUrl ?? null,
          bio: MY_PLAYER.bio ?? null,
          color: MY_PLAYER.color,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // GET /api/activity
    if (url.includes("/api/activity") && method === "GET") {
      return new Response(
        JSON.stringify({
          games: MOCK_GAME_ACTIVITY.map((g) => ({
            id: g.id,
            game: g.game,
            cover_url: g.coverUrl ?? null,
            genres: g.genres,
            entries: g.entries.map((e) => ({
              session_id: e.sessionId,
              player: {
                id: e.player.id,
                handle: e.player.handle,
                name: e.player.name,
                avatar_url: e.player.avatarUrl ?? null,
                color: e.player.color,
              },
              duration_seconds: 0,
              played_at: e.playedAt.toISOString(),
              log: e.log ?? null,
            })),
          })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // /api/players/:id/follow (POST or DELETE) — must match before /:id
    const followMatch = url.match(/\/api\/players\/([^/]+)\/follow$/);
    if (followMatch) {
      const pid = followMatch[1];
      if (method === "POST") followState[pid] = true;
      if (method === "DELETE") followState[pid] = false;
      return new Response(null, { status: 200 });
    }

    // GET /api/players/:id/followers
    const followersMatch = url.match(/\/api\/players\/([^/]+)\/followers$/);
    if (followersMatch && method === "GET") {
      const pid = followersMatch[1];
      const players = MOCK_FOLLOW_LISTS[pid]?.followers ?? [];
      return new Response(
        JSON.stringify({ players: players.map(toRawPlayer) }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // GET /api/players/:id/following
    const followingMatch = url.match(/\/api\/players\/([^/]+)\/following$/);
    if (followingMatch && method === "GET") {
      const pid = followingMatch[1];
      const players = MOCK_FOLLOW_LISTS[pid]?.following ?? [];
      return new Response(
        JSON.stringify({ players: players.map(toRawPlayer) }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // GET /api/players/:id/journeys
    const journeysMatch = url.match(/\/api\/players\/([^/]+)\/journeys$/);
    if (journeysMatch && method === "GET") {
      const pid = journeysMatch[1];
      const journeys = JOURNEYS.filter((j) => j.player.id === pid);
      return new Response(
        JSON.stringify({
          journeys: journeys.map((j) => ({
            id: j.id,
            igdb_id: 0,
            game: j.game,
            cover_url: j.coverUrl ?? null,
            genres: j.genres,
            played_at: j.playedAt.toISOString(),
            duration_seconds: 0,
            log: j.log ?? null,
          })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // GET /api/players/:id
    const playerMatch = url.match(/\/api\/players\/([^/]+)$/);
    if (playerMatch && method === "GET") {
      const pid = playerMatch[1];
      const player = ALL_PLAYERS.find((p) => p.id === pid);
      if (!player) return new Response("not found", { status: 404 });
      return new Response(
        JSON.stringify({
          ...toRawPlayer(player),
          is_following: followState[player.id] ?? false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("not found", { status: 404 });
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", makeDefaultFetch());
});

afterEach(() => {
  vi.unstubAllGlobals();
});
