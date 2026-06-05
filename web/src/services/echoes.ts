// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Echo } from "@/models/echo";
import type { Player } from "@/models/player";
import { API_BASE, apiFetch } from "@/lib/api";

type RawActor = {
  id: string;
  handle: string;
  name: string;
  avatar_url?: string;
  color: string;
};

type RawEcho = {
  id: number;
  type: string;
  actors: RawActor[];
  actor_count: number;
  subject_id: string | null;
  subject_title: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
};

function rawToPlayer(a: RawActor): Player {
  return { id: a.id, handle: a.handle, name: a.name, avatarUrl: a.avatar_url, color: a.color };
}

export async function getEchoes(): Promise<Echo[]> {
  const resp = await apiFetch(`${API_BASE}/api/echoes`, { credentials: "include" });
  if (!resp.ok) throw new Error(`get echoes: ${resp.status}`);
  const data: { echoes: RawEcho[] } = await resp.json();
  return (data.echoes ?? []).map(
    (r): Echo => ({
      id: String(r.id),
      type: r.type as Echo["type"],
      actors: (r.actors ?? []).map(rawToPlayer),
      actorCount: r.actor_count,
      subjectId: r.subject_id ?? null,
      subjectTitle: r.subject_title ?? null,
      read: r.read,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }),
  );
}

export async function markAllRead(): Promise<void> {
  const resp = await apiFetch(`${API_BASE}/api/echoes/read`, {
    method: "POST",
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`mark echoes read: ${resp.status}`);
}
