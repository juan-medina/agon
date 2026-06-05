// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

const PALETTE = [
  "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-red-500/15 text-red-700 dark:text-red-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
];

function hashGenre(genre: string): number {
  let h = 0;
  for (let i = 0; i < genre.length; i++) {
    h = (h * 31 + genre.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h);
}

export function genreColor(genre: string): string {
  return PALETTE[hashGenre(genre) % PALETTE.length];
}

// CSS hex colors matching the chip palette — used for bar fills.
const BAR_COLORS = [
  "#a855f7", // purple
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#14b8a6", // teal
  "#f97316", // orange
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#0ea5e9", // sky
  "#f43f5e", // rose
];

export function genreBarColor(genre: string): string {
  return BAR_COLORS[hashGenre(genre) % BAR_COLORS.length];
}
