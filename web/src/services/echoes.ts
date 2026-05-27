// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Echo } from "@/models/echo";
import { MOCK_ECHOES } from "@/lib/mock";

const _echoes: Echo[] = [...MOCK_ECHOES];
const readIds = new Set<string>(_echoes.filter((e) => e.read).map((e) => e.id));

export async function getEchoes(): Promise<Echo[]> {
  return _echoes.map((e) => ({ ...e, read: readIds.has(e.id) }));
}

export async function markAllRead(): Promise<void> {
  _echoes.forEach((e) => readIds.add(e.id));
}

export function _reset(): void {
  readIds.clear();
  _echoes.filter((e) => e.read).forEach((e) => readIds.add(e.id));
}
