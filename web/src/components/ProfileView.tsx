// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useState, type ReactNode } from "react";
import { avatarSrc, initials } from "@/lib/display";
import FollowListModal from "@/components/FollowListModal";
import JourneyCard from "@/components/JourneyCard";
import type { Journey, Player } from "@/models";

function parseMins(duration: string): number {
  const h = parseInt(duration.match(/(\d+)h/)?.[1] ?? "0");
  const m = parseInt(duration.match(/(\d+)m/)?.[1] ?? "0");
  return h * 60 + m;
}

function formatHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function totalHours(journeys: Journey[]): string {
  return formatHours(journeys.reduce((acc, j) => acc + parseMins(j.duration), 0));
}

type GameStat = { game: string; coverUrl?: string; totalMins: number };

function getTopGames(journeys: Journey[]): GameStat[] {
  const map = new Map<string, GameStat>();
  for (const j of journeys) {
    const mins = parseMins(j.duration);
    const existing = map.get(j.game);
    if (existing) {
      existing.totalMins += mins;
    } else {
      map.set(j.game, { game: j.game, coverUrl: j.coverUrl, totalMins: mins });
    }
  }
  return [...map.values()].sort((a, b) => b.totalMins - a.totalMins).slice(0, 5);
}

function getTopGenres(journeys: Journey[]): string[] {
  const counts = new Map<string, number>();
  for (const j of journeys) {
    for (const g of j.genres) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([g]) => g);
}

// Returns 84 daily session counts, index 0 = 83 days ago, index 83 = today.
function buildHeatmap(journeys: Journey[]): number[] {
  const days = new Array<number>(84).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMs = today.getTime() - 83 * 86400000;
  for (const j of journeys) {
    const d = new Date(j.playedAt);
    d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - startMs) / 86400000);
    if (idx >= 0 && idx < 84) days[idx]++;
  }
  return days;
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return `rgba(100,100,100,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface ProfileViewProps {
  player: Player;
  journeys: Journey[];
  followers: Player[];
  following: Player[];
  journeyQueryKey: unknown[];
  sectionTitle: string;
  /** Back button or other nav rendered above the profile card */
  header?: ReactNode;
  /** Follow/unfollow button rendered at the trailing edge of the profile card */
  profileActions?: ReactNode;
  /** Bio area: editable widget (Hero) or plain text (PlayerProfile) */
  bioContent?: ReactNode;
}

export default function ProfileView({
  player,
  journeys,
  followers,
  following,
  journeyQueryKey,
  sectionTitle,
  header,
  profileActions,
  bioContent,
}: ProfileViewProps) {
  const [followList, setFollowList] = useState<{ title: string; players: Player[] } | null>(null);

  const topGames = getTopGames(journeys);
  const topGenres = getTopGenres(journeys);
  const heatmap = buildHeatmap(journeys);
  const maxSessions = Math.max(...heatmap, 1);

  return (
    <div className="mx-auto max-w-2xl">
      {header && <div className="mb-4 flex items-center gap-3">{header}</div>}

      {/* Profile card */}
      <div className="mb-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="h-16 w-16 shrink-0">
            <img
              src={avatarSrc(player)}
              alt={player.name}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                target.nextElementSibling?.removeAttribute("hidden");
              }}
            />
            <div
              hidden
              className="flex h-full w-full items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ backgroundColor: player.color }}
            >
              {initials(player.name)}
            </div>
          </div>

          {/* Name, handle, bio */}
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xl font-bold leading-tight">{player.name}</p>
            <p className="mb-3 text-sm text-muted-foreground">@{player.handle}</p>
            {bioContent}
          </div>

          {profileActions}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 divide-x divide-border rounded-lg border border-border bg-card">
        {[
          { label: "Journeys", value: journeys.length, onClick: undefined },
          { label: "Hours", value: totalHours(journeys), onClick: undefined },
          {
            label: "Followers",
            value: player.followers ?? followers.length,
            onClick: () => setFollowList({ title: "Followers", players: followers }),
          },
          {
            label: "Following",
            value: player.following ?? following.length,
            onClick: () => setFollowList({ title: "Following", players: following }),
          },
        ].map(({ label, value, onClick }) =>
          onClick ? (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-center py-4 transition-colors hover:bg-accent/50"
            >
              <span className="text-lg font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </button>
          ) : (
            <div key={label} className="flex flex-col items-center py-4">
              <span className="text-lg font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ),
        )}
      </div>

      {/* Top games */}
      {topGames.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Top Games
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {topGames.map((g) => (
              <div key={g.game} className="w-24 shrink-0">
                {g.coverUrl ? (
                  <img
                    src={g.coverUrl}
                    alt={g.game}
                    className="mb-2 aspect-[3/4] w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="mb-2 flex aspect-[3/4] w-full items-center justify-center rounded-md bg-muted">
                    <span className="px-1 text-center text-xs text-muted-foreground">{g.game}</span>
                  </div>
                )}
                <p className="truncate text-xs font-medium" title={g.game}>
                  {g.game}
                </p>
                <p className="text-xs text-muted-foreground">{formatHours(g.totalMins)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genre chips */}
      {topGenres.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Genres
          </h2>
          <div className="flex flex-wrap gap-2">
            {topGenres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activity heatmap — 12 weeks, column-major: each column = one week */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Activity — last 12 weeks
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid grid-rows-7 grid-flow-col gap-1">
            {heatmap.map((count, idx) => {
              const alpha = count === 0 ? 0 : 0.25 + (count / maxSessions) * 0.75;
              return (
                <div
                  key={idx}
                  className="h-3 w-3 rounded-sm bg-border"
                  style={count > 0 ? { backgroundColor: hexToRgba(player.color, alpha) } : undefined}
                  title={count > 0 ? `${count} session${count !== 1 ? "s" : ""}` : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Journeys */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {sectionTitle}
      </h2>

      {journeys.length > 0 ? (
        <div className="flex flex-col gap-3">
          {journeys.map((journey) => (
            <JourneyCard key={journey.id} journey={journey} queryKey={journeyQueryKey} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No journeys yet.
        </div>
      )}

      <div className="h-8" />

      {followList && (
        <FollowListModal
          title={followList.title}
          players={followList.players}
          onClose={() => setFollowList(null)}
        />
      )}
    </div>
  );
}
