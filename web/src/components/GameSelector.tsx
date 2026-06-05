// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useState } from "react";
import { Search } from "lucide-react";
import GenreChip from "@/components/GenreChip";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { searchGames } from "@/services/games";
import type { Game } from "@/models/game";

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
  const { data: results = [] } = useQuery({
    queryKey: ["games", "search", query],
    queryFn: () => searchGames(query),
    enabled: searching && query.length >= 2,
  });

  if (!searching && value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
        <GameCover game={value.game} coverUrl={value.coverUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{value.game}</div>
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("game_search_placeholder")}
          autoFocus
          className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {results.length > 0 && (
        <div className="mt-1 divide-y divide-border overflow-hidden rounded-md border border-border">
          {results.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => { onChange(g); setSearching(false); setQuery(""); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/10"
            >
              <GameCover game={g.game} coverUrl={g.coverUrl} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{g.game}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {g.genres.map((genre) => (
                    <span key={genre} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{genre}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{t("game_no_results", { query })}</p>
      )}
    </div>
  );
}
