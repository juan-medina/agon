// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Journey } from "@/models/journey";
import { JOURNEYS } from "@/lib/mock";
import { likedIds } from "./journeys";

let _journeys: Journey[] = [...JOURNEYS];

export async function getFeedJourneys(): Promise<Journey[]> {
  return _journeys.map((j) => ({ ...j, liked: likedIds.has(j.id) }));
}

export function _reset(): void {
  _journeys = [...JOURNEYS];
}
