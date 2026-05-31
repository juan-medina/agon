// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Player } from "@/models/player";
import type { Journey } from "@/models/journey";
import type { GameActivity } from "@/models/game";
import {
  PLAYERS,
  JOURNEYS,
  MY_FOLLOWING,
  MY_FOLLOWERS,
  MY_PLAYER,
  MOCK_FOLLOW_LISTS,
  MOCK_GAME_ACTIVITY,
} from "@/lib/mock";
import { likedIds } from "./journeys";

const _players: Player[] = [...PLAYERS];
const _journeys: Journey[] = [...JOURNEYS];
const _myFollowing: Player[] = [...MY_FOLLOWING];
const _myFollowers: Player[] = [...MY_FOLLOWERS];
const _myPlayerId: string = MY_PLAYER.id;
const _followLists: Record<string, { followers: Player[]; following: Player[] }> = MOCK_FOLLOW_LISTS;
const _gameActivity: GameActivity[] = [...MOCK_GAME_ACTIVITY];

const followingHandles = new Set<string>(_myFollowing.map((p) => p.handle));

export function isFollowingHandle(handle: string): boolean {
  return followingHandles.has(handle);
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  const fromPlayers = _players.find((p) => p.id === id);
  if (fromPlayers) return fromPlayers;
  const fromJourneys = _journeys.find((j) => j.player.id === id)?.player;
  if (fromJourneys) return fromJourneys;
  return _gameActivity.flatMap((g) => g.entries)
    .find((e) => e.player.id === id)?.player;
}

export async function getPlayerJourneys(id: string): Promise<Journey[]> {
  return _journeys
    .filter((j) => j.player.id === id)
    .map((j) => ({ ...j, liked: likedIds.has(j.id) }));
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
