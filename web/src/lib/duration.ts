// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

export function parseDuration(input: string): { hours: number; minutes: number } | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1]);
    const m = parseInt(colonMatch[2]);
    if (m < 60) return { hours: h, minutes: m };
  }
  const hmMatch = s.match(/^(\d+)h(\d+)m?$/);
  if (hmMatch) {
    const m = parseInt(hmMatch[2]);
    if (m < 60) return { hours: parseInt(hmMatch[1]), minutes: m };
  }
  const hMatch = s.match(/^(\d+)h$/);
  if (hMatch) return { hours: parseInt(hMatch[1]), minutes: 0 };
  const mMatch = s.match(/^(\d+)m$/);
  if (mMatch) {
    const total = parseInt(mMatch[1]);
    return { hours: Math.floor(total / 60), minutes: total % 60 };
  }
  return null;
}

export function formatParsedDuration(d: { hours: number; minutes: number }): string {
  if (d.hours > 0 && d.minutes > 0) return `${d.hours}h ${d.minutes}m`;
  if (d.hours > 0) return `${d.hours}h`;
  return `${d.minutes}m`;
}
