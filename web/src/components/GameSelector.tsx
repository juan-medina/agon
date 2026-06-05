// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import GenreChip from "@/components/GenreChip";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { searchGames } from "@/services/games";
import type { Game } from "@/models/game";

const CATEGORY_LABELS: Record<number, string> = {
  1: "DLC",
  2: "Expansion",
  3: "Bundle",
  4: "Standalone Expansion",
  5: "Mod",
  6: "Episode",
  7: "Season",
  8: "Remake",
  9: "Remaster",
  10: "Expanded Game",
  11: "Port",
  12: "Fork",
  13: "Pack",
  14: "Update",
};

function CategoryBadge({ category }: { category?: number }) {
  if (category == null) return null;
  const label = CATEGORY_LABELS[category];
  if (!label) return null;
  return (
    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
      {label}
    </span>
  );
}

export function GameCover({ game, coverUrl, size }: { game: string; coverUrl?: string; size: "sm" | "md" }) {
  const dims = size === "sm" ? "h-10 w-10 text-lg" : "h-16 w-16 text-2xl";
  return (
    <div className={`relative ${dims} shrink-0 overflow-hidden rounded-md bg-slate-800`}>
      {coverUrl
        ? <img src={coverUrl} alt={game} className="absolute inset-0 h-full w-full object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center font-bold text-slate-300">{game[0]}</span>
      }
    </div>
  );
}

export function GameSelector({
  value,
  onChange,
  initialQuery = "",
}: {
  value: Game | null;
  onChange: (game: Game) => void;
  initialQuery?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(value === null);
  const [page, setPage] = useState(0);
  const offset = page * 10;
  const { data: results = [] } = useQuery({
    queryKey: ["games", "search", query, page],
    queryFn: () => searchGames(query, offset),
    enabled: searching && query.length >= 2,
  });

  if (!searching && value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
        <GameCover game={value.game} coverUrl={value.coverUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 font-medium">
            {value.game}
            {value.releaseYear && (
              <span className="text-xs font-normal text-muted-foreground">({value.releaseYear})</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {value.genres.map((g) => (
              <GenreChip key={g} genre={g} size="sm" />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setSearching(true); setQuery(value.game); }}
          className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
        >
          {t("game_change")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder={t("game_search_placeholder")}
          autoFocus
          className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {results.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-md border border-border">
          <div className="divide-y divide-border">
            {results.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => { onChange(g); setSearching(false); setQuery(""); setPage(0); }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/10"
              >
                <GameCover game={g.game} coverUrl={g.coverUrl} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 text-sm font-medium">
                    {g.game}
                    {g.releaseYear && (
                      <span className="text-xs font-normal text-muted-foreground">({g.releaseYear})</span>
                    )}
                    <CategoryBadge category={g.category} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {g.genres.map((genre) => (
                      <span key={genre} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{genre}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft size={14} /> {t("prev")}
            </button>
            <span className="text-xs text-muted-foreground">{t("page")} {page + 1}</span>
            <button
              type="button"
              disabled={results.length < 10}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              {t("next")} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{t("game_no_results", { query })}</p>
      )}
    </div>
  );
}
