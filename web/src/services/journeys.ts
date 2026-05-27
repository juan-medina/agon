// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Session } from "@/models/session";
import type { Comment, JourneyPlayer } from "@/models/game";
import type { Player } from "@/models/player";
import { SESSIONS, MOCK_COMMENTS, MOCK_LIKERS, MOCK_FRIENDS_ON_JOURNEY, MOCK_OTHERS_ON_JOURNEY } from "@/lib/mock";
import { likedIds } from "./sessions";
import { isFollowingHandle } from "./players";
import { getCurrentPlayer } from "./auth";

let _sessions: Session[] = [...SESSIONS];
let _comments: Comment[] = [...MOCK_COMMENTS];
const _likers: Player[] = [...MOCK_LIKERS];
const _friendsOnJourney: JourneyPlayer[] = [...MOCK_FRIENDS_ON_JOURNEY];
const _othersOnJourney: JourneyPlayer[] = [...MOCK_OTHERS_ON_JOURNEY];
const extraComments = new Map<string, Comment[]>();

export async function getJourney(id: string): Promise<Session | undefined> {
  const session = _sessions.find((s) => s.id === id);
  if (!session) return undefined;
  return { ...session, liked: likedIds.has(id) };
}

export async function getComments(sessionId: string): Promise<Comment[]> {
  const base = sessionId === "s1" ? _comments : [];
  return [...base, ...(extraComments.get(sessionId) ?? [])];
}

export async function getLikers(_sessionId: string): Promise<Player[]> {
  return [..._likers];
}

export async function getJourneyPlayers(_sessionId: string): Promise<{
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

export async function postComment(sessionId: string, text: string): Promise<void> {
  const player = await getCurrentPlayer();
  const comment: Comment = {
    id: `new-${Date.now()}`,
    player,
    text,
    commentedAt: new Date(),
  };
  extraComments.set(sessionId, [...(extraComments.get(sessionId) ?? []), comment]);
}

export async function deleteJourney(sessionId: string): Promise<void> {
  _sessions = _sessions.filter((s) => s.id !== sessionId);
}

export async function deleteComment(sessionId: string, commentId: string): Promise<void> {
  const extra = extraComments.get(sessionId);
  if (extra?.some((c) => c.id === commentId)) {
    extraComments.set(sessionId, extra.filter((c) => c.id !== commentId));
    return;
  }
  _comments = _comments.filter((c) => c.id !== commentId);
}

export function _reset(): void {
  extraComments.clear();
  _sessions = [...SESSIONS];
  _comments = [...MOCK_COMMENTS];
}
