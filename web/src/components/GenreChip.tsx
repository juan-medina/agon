// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { cn } from "@/lib/utils";
import { genreColor } from "@/lib/genres";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-[11px]",
  lg: "px-3 py-1 text-xs font-medium",
};

type GenreChipProps = { genre: string; size?: Size };

export default function GenreChip({ genre, size = "md" }: GenreChipProps) {
  return (
    <span
      className={cn("block truncate rounded-full", SIZE[size], genreColor(genre))}
      title={genre}
    >
      {genre}
    </span>
  );
}
