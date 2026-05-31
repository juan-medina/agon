// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useState, type ReactNode } from "react";
import { avatarSrc, initials } from "@/lib/display";
import FollowListModal from "@/components/FollowListModal";
import JourneyCard from "@/components/JourneyCard";
import type { Journey, Player } from "@/models";

function totalHours(journeys: Journey[]): string {
  const mins = journeys.reduce((acc, j) => {
    const h = parseInt(j.duration.match(/(\d+)h/)?.[1] ?? "0");
    const m = parseInt(j.duration.match(/(\d+)m/)?.[1] ?? "0");
    return acc + h * 60 + m;
  }, 0);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
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
