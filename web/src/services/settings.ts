// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Exclusion, GameHint } from "@/models/settings";
import { API_BASE } from "@/lib/api";

type RawExclusion = { exe_name: string };
type RawHint = { exe_name: string; igdb_id: number; title: string };

export async function getExclusions(): Promise<Exclusion[]> {
  const resp = await fetch(`${API_BASE}/api/settings/exclusions`, { credentials: "include" });
  if (!resp.ok) throw new Error(`get exclusions: ${resp.status}`);
  const data: { exclusions: RawExclusion[] } = await resp.json();
  return (data.exclusions ?? []).map((e) => ({ exeName: e.exe_name }));
}

export async function addExclusion(exeName: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/api/settings/exclusions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exe_name: exeName }),
  });
  if (!resp.ok) throw new Error(`add exclusion: ${resp.status}`);
}

export async function removeExclusion(exeName: string): Promise<void> {
  const resp = await fetch(
    `${API_BASE}/api/settings/exclusions/${encodeURIComponent(exeName)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!resp.ok) throw new Error(`remove exclusion: ${resp.status}`);
}

export async function getGameHints(): Promise<GameHint[]> {
  const resp = await fetch(`${API_BASE}/api/settings/hints`, { credentials: "include" });
  if (!resp.ok) throw new Error(`get hints: ${resp.status}`);
  const data: { hints: RawHint[] } = await resp.json();
  return (data.hints ?? []).map((h) => ({ exeName: h.exe_name, game: h.title }));
}

export async function addGameHint(exeName: string, igdbId: number): Promise<void> {
  const resp = await fetch(
    `${API_BASE}/api/settings/hints/${encodeURIComponent(exeName)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ igdb_id: igdbId }),
    },
  );
  if (!resp.ok) throw new Error(`add hint: ${resp.status}`);
}

export async function removeGameHint(exeName: string): Promise<void> {
  const resp = await fetch(
    `${API_BASE}/api/settings/hints/${encodeURIComponent(exeName)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!resp.ok) throw new Error(`remove hint: ${resp.status}`);
}

export async function updateGameHint(exeName: string, igdbId: number): Promise<void> {
  return addGameHint(exeName, igdbId);
}
