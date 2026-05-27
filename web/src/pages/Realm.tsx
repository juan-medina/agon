// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { Link, useNavigate } from "react-router";
import { Clock, Heart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeedJourneys } from "@/services/feed";
import { toggleLike } from "@/services/journeys";
import { avatarSrc, playerHref } from "@/lib/display";
import { MY_PLAYER_ID } from "@/services/auth";
import { formatJourneyDate } from "@/lib/time";
import type { Journey } from "@/models";

function JourneyCard({ journey }: { journey: Journey }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: toggleLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  return (
    <article
      className="flex cursor-pointer gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5"
      onClick={() => navigate(`/journey/${journey.id}`)}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-800">
        {journey.coverUrl
          ? <img src={journey.coverUrl} alt={journey.game} className="absolute inset-0 h-full w-full object-cover" />
          : <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-300">{journey.game[0]}</span>
        }
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <Link
            to={playerHref(journey.player, MY_PLAYER_ID)}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2"
          >
            <img
              src={avatarSrc(journey.player)}
              alt={journey.player.name}
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
            <span className="text-sm font-semibold leading-none">{journey.player.name}</span>
          </Link>
          <span className="truncate text-xs text-muted-foreground">
            @{journey.player.handle}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatJourneyDate(journey.playedAt)}
          </span>
        </div>

        <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold">{journey.game}</span>
          <div className="flex flex-wrap gap-1">
            {journey.genres.map((g) => (
              <span
                key={g}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>{journey.duration}</span>
        </div>

        {journey.log && (
          <p className="mb-2 text-sm italic text-muted-foreground">&ldquo;{journey.log}&rdquo;</p>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); likeMutation.mutate(journey.id); }}
          className="flex items-center gap-1.5 transition-colors"
          aria-label={journey.liked ? "Unlike" : "Like"}
        >
          <Heart
            size={15}
            className={
              journey.liked ? "fill-rose-500 text-rose-500" : "text-muted-foreground hover:text-rose-400"
            }
          />
          {(journey.likes + (journey.liked ? 1 : 0)) > 0 && (
            <span className={`text-xs ${journey.liked ? "text-rose-500" : "text-muted-foreground"}`}>
              {journey.likes + (journey.liked ? 1 : 0)}
            </span>
          )}
        </button>
      </div>
    </article>
  );
}

export default function Realm() {
  const { data: journeys = [] } = useQuery({ queryKey: ["feed"], queryFn: getFeedJourneys });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-3">
        {journeys.map((journey) => (
          <JourneyCard key={journey.id} journey={journey} />
        ))}
      </div>
    </div>
  );
}
