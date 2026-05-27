// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Player } from "@/models/player";
import type { Session } from "@/models/session";
import type { GameActivity } from "@/models/game";
import {
  PLAYERS,
  SESSIONS,
  MY_FOLLOWING,
  MY_FOLLOWERS,
  MY_PLAYER,
  MOCK_FOLLOW_LISTS,
  MOCK_GAME_ACTIVITY,
} from "@/lib/mock";
import { likedIds } from "./sessions";

const _players: Player[] = [...PLAYERS];
const _sessions: Session[] = [...SESSIONS];
const _myFollowing: Player[] = [...MY_FOLLOWING];
const _myFollowers: Player[] = [...MY_FOLLOWERS];
const _myPlayerId: string = MY_PLAYER.id;
const _followLists: Record<string, { followers: Player[]; following: Player[] }> = MOCK_FOLLOW_LISTS;
const _gameActivity: GameActivity[] = [...MOCK_GAME_ACTIVITY];

const followingHandles = new Set<string>(_myFollowing.map((p) => p.handle));

export function isFollowingHandle(handle: string): boolean {
  return followingHandles.has(handle);
}

export async function getPlayer(handle: string): Promise<Player | undefined> {
  const fromPlayers = _players.find((p) => p.handle === handle);
  if (fromPlayers) return fromPlayers;
  const fromSessions = _sessions.find((s) => s.player.handle === handle)?.player;
  if (fromSessions) return fromSessions;
  return _gameActivity.flatMap((g) => g.entries)
    .find((e) => e.player.handle === handle)?.player;
}

export async function getPlayerSessions(handle: string): Promise<Session[]> {
  return _sessions
    .filter((s) => s.player.handle === handle)
    .map((s) => ({ ...s, liked: likedIds.has(s.id) }));
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
