// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Journey, PendingJourney, NewJourney } from "@/models/journey";
import type { Comment, JourneyPlayer } from "@/models/game";
import type { Player } from "@/models/player";
import {
  JOURNEYS,
  MOCK_PENDING_JOURNEYS,
  MY_PLAYER,
  MOCK_COMMENTS,
  MOCK_LIKERS,
  MOCK_FRIENDS_ON_JOURNEY,
  MOCK_OTHERS_ON_JOURNEY,
} from "@/lib/mock";
import { isFollowingHandle } from "./players";
import { getCurrentPlayer } from "./auth";

export const likedIds = new Set<string>();

let _history: Journey[] = JOURNEYS.filter((j) => j.player.id === MY_PLAYER.id);
let _pending: PendingJourney[] = [...MOCK_PENDING_JOURNEYS];

export async function getUserJourneys(): Promise<Journey[]> {
  return _history.map((j) => ({ ...j, liked: likedIds.has(j.id) }));
}

export async function getPendingJourneys(): Promise<PendingJourney[]> {
  return [..._pending];
}

export async function toggleLike(journeyId: string): Promise<void> {
  if (likedIds.has(journeyId)) likedIds.delete(journeyId);
  else likedIds.add(journeyId);
}

export async function addJourney(input: NewJourney): Promise<void> {
  const journey: Journey = {
    id: `m-${Date.now()}`,
    player: MY_PLAYER,
    ...input,
    likes: 0,
    liked: false,
  };
  _history = [journey, ..._history];
}

export async function confirmPendingJourney(
  pendingId: string,
  input: { game: string; coverUrl?: string; genres: string[]; log?: string },
): Promise<void> {
  const pending = _pending.find((p) => p.id === pendingId);
  if (!pending) return;
  const journey: Journey = {
    id: `c-${Date.now()}`,
    player: MY_PLAYER,
    game: input.game,
    coverUrl: input.coverUrl,
    genres: input.genres,
    duration: pending.duration,
    playedAt: pending.endedAt,
    log: input.log,
    likes: 0,
    liked: false,
  };
  _history = [journey, ..._history];
  _pending = _pending.filter((p) => p.id !== pendingId);
}

export async function dismissPendingJourney(pendingId: string): Promise<void> {
  _pending = _pending.filter((p) => p.id !== pendingId);
}

let _journeys: Journey[] = [...JOURNEYS];
let _comments: Comment[] = [...MOCK_COMMENTS];
const _likers: Player[] = [...MOCK_LIKERS];
const _friendsOnJourney: JourneyPlayer[] = [...MOCK_FRIENDS_ON_JOURNEY];
const _othersOnJourney: JourneyPlayer[] = [...MOCK_OTHERS_ON_JOURNEY];
const extraComments = new Map<string, Comment[]>();

export async function getJourney(id: string): Promise<Journey | undefined> {
  const journey = _journeys.find((j) => j.id === id);
  if (!journey) return undefined;
  return { ...journey, liked: likedIds.has(id) };
}

export async function getComments(journeyId: string): Promise<Comment[]> {
  const base = journeyId === "s1" ? _comments : [];
  return [...base, ...(extraComments.get(journeyId) ?? [])];
}

export async function getLikers(_journeyId: string): Promise<Player[]> {
  return [..._likers];
}

export async function getJourneyPlayers(_journeyId: string): Promise<{
  friends: JourneyPlayer[];
  others: JourneyPlayer[];
}> {
  return {
    friends: _friendsOnJourney.map((jp) => ({
      ...jp,
      isFollowing: isFollowingHandle(jp.player.handle),
    })),
    others: _othersOnJourney.map((jp) => ({
      ...jp,
      isFollowing: isFollowingHandle(jp.player.handle),
    })),
  };
}

export async function postComment(journeyId: string, text: string): Promise<void> {
  const player = await getCurrentPlayer();
  const comment: Comment = {
    id: `new-${Date.now()}`,
    player,
    text,
    commentedAt: new Date(),
  };
  extraComments.set(journeyId, [...(extraComments.get(journeyId) ?? []), comment]);
}

export async function deleteJourney(journeyId: string): Promise<void> {
  _journeys = _journeys.filter((j) => j.id !== journeyId);
}

export async function deleteComment(journeyId: string, commentId: string): Promise<void> {
  const extra = extraComments.get(journeyId);
  if (extra?.some((c) => c.id === commentId)) {
    extraComments.set(journeyId, extra.filter((c) => c.id !== commentId));
    return;
  }
  _comments = _comments.filter((c) => c.id !== commentId);
}

export function _reset(): void {
  likedIds.clear();
  _history = JOURNEYS.filter((j) => j.player.id === MY_PLAYER.id);
  _pending = [...MOCK_PENDING_JOURNEYS];
  extraComments.clear();
  _journeys = [...JOURNEYS];
  _comments = [...MOCK_COMMENTS];
}
