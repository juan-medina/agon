// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Session } from "@/models/session";
import { SESSIONS } from "@/lib/mock";
import { likedIds } from "./sessions";

let _sessions: Session[] = [...SESSIONS];

export async function getFeedSessions(): Promise<Session[]> {
  return _sessions.map((s) => ({ ...s, liked: likedIds.has(s.id) }));
}

export function _reset(): void {
  _sessions = [...SESSIONS];
}
