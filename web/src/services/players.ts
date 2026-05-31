// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Player } from "@/models/player";
import type { Journey } from "@/models/journey";
import {
  MY_FOLLOWING,
  MY_FOLLOWERS,
  MY_PLAYER,
  MOCK_FOLLOW_LISTS,
} from "@/lib/mock";
import { likedIds } from "./journeys";
import { API_BASE } from "@/lib/api";
import { formatDuration } from "@/lib/time";

const _myFollowing: Player[] = [...MY_FOLLOWING];
const _myFollowers: Player[] = [...MY_FOLLOWERS];
const _myPlayerId: string = MY_PLAYER.id;
const _followLists: Record<string, { followers: Player[]; following: Player[] }> = MOCK_FOLLOW_LISTS;

const followingHandles = new Set<string>(_myFollowing.map((p) => p.handle));

type RawPlayer = {
  id: string;
  handle: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  color: string;
};

type RawJourney = {
  id: string;
  igdb_id: number;
  game: string;
  cover_url?: string;
  genres: string[];
  played_at: string;
  duration_seconds: number;
  log?: string;
};

export function isFollowingHandle(handle: string): boolean {
  return followingHandles.has(handle);
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  const resp = await fetch(`${API_BASE}/api/players/${id}`);
  if (resp.status === 404) return undefined;
  if (!resp.ok) throw new Error(`get player: ${resp.status}`);
  const p: RawPlayer = await resp.json();
  return {
    id: p.id,
    handle: p.handle,
    name: p.name,
    avatarUrl: p.avatar_url,
    bio: p.bio,
    color: p.color,
  };
}

export async function getPlayerJourneys(id: string): Promise<Journey[]> {
  const [player, resp] = await Promise.all([
    getPlayer(id),
    fetch(`${API_BASE}/api/players/${id}/journeys`),
  ]);
  if (!player) return [];
  if (!resp.ok) throw new Error(`get player journeys: ${resp.status}`);
  const data: { journeys: RawJourney[] } = await resp.json();
  return (data.journeys ?? []).map((j): Journey => ({
    id: j.id,
    player,
    game: j.game,
    coverUrl: j.cover_url,
    genres: j.genres,
    duration: formatDuration(j.duration_seconds ?? 0),
    playedAt: new Date(j.played_at),
    log: j.log,
    likes: 0,
    liked: likedIds.has(j.id),
  }));
}

export async function getFollowers(playerId: string): Promise<Player[]> {
  if (playerId === _myPlayerId) return [..._myFollowers];
  return [...(_followLists[playerId]?.followers ?? [])];
}

export async function getFollowing(playerId: string): Promise<Player[]> {
  if (playerId === _myPlayerId) return [..._myFollowing];
  return [...(_followLists[playerId]?.following ?? [])];
}

export async function toggleFollow(handle: string): Promise<void> {
  if (followingHandles.has(handle)) followingHandles.delete(handle);
  else followingHandles.add(handle);
}

export function _reset(): void {
  followingHandles.clear();
  _myFollowing.forEach((p) => followingHandles.add(p.handle));
}
