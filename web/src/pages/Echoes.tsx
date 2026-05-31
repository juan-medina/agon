// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Heart, MessageSquare, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEchoes, markAllRead } from "@/services/echoes";
import { avatarSrc } from "@/lib/display";
import { formatCommentAge } from "@/lib/time";
import FollowListModal from "@/components/FollowListModal";
import type { Echo, Player } from "@/models";

type Filter = "all" | "comments" | "likes" | "followers";

function ActorAvatars({ actors }: { actors: Player[] }) {
  return (
    <div className="flex shrink-0 -space-x-2">
      {actors.slice(0, 3).map((a) => (
        <img
          key={a.id}
          src={avatarSrc(a)}
          alt={a.name}
          className="h-8 w-8 rounded-full object-cover ring-2 ring-card"
        />
      ))}
    </div>
  );
}

function EchoIcon({ type }: { type: Echo["type"] }) {
  const icon =
    type === "new_comment" ? <MessageSquare size={13} /> :
    type === "new_like"    ? <Heart size={13} /> :
                             <UserPlus size={13} />;
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {icon}
    </div>
  );
}

function formatActors(actors: Player[], actorCount: number): string {
  if (actors.length === 0) return "Someone";
  const names = actors.map((a) => a.name);
  const extra = actorCount - names.length;
  if (extra > 0) return `${names.join(", ")} and ${extra} other${extra > 1 ? "s" : ""}`;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function EchoRow({ echo }: { echo: Echo }) {
  const [showActors, setShowActors] = useState(false);

  const isFollowerBatch = echo.type === "new_follower" && echo.actorCount > 1;
  const journeyDeleted =
    (echo.type === "new_comment" || echo.type === "new_like") && echo.subjectId === null;
  const to =
    echo.type === "new_comment" || echo.type === "new_like"
      ? `/journey/${echo.subjectId}`
      : `/player/${echo.actors[0]?.id}`;

  const actorLabel = formatActors(echo.actors, echo.actorCount);

  const rowClass = `flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/5 ${
    !echo.read ? "border-l-2 border-primary bg-primary/5" : "border-l-2 border-transparent"
  }`;

  const body = (
    <>
      <EchoIcon type={echo.type} />
      <ActorAvatars actors={echo.actors} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{actorLabel}</span>
          {echo.type === "new_comment" ? (
            <>
              {" "}commented on your{" "}
              <span className="font-medium">{echo.subjectTitle}</span> journey
              {journeyDeleted && (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  removed
                </span>
              )}
            </>
          ) : echo.type === "new_like" ? (
            <>
              {" "}liked your{" "}
              <span className="font-medium">{echo.subjectTitle}</span> journey
              {journeyDeleted && (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  removed
                </span>
              )}
            </>
          ) : (
            <> started following you</>
          )}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatCommentAge(echo.updatedAt)}
      </span>
    </>
  );

  return (
    <>
      {isFollowerBatch ? (
        <button className={rowClass} onClick={() => setShowActors(true)}>
          {body}
        </button>
      ) : journeyDeleted ? (
        <div className={`${rowClass} cursor-default opacity-60`}>
          {body}
        </div>
      ) : (
        <Link to={to} className={rowClass}>
          {body}
        </Link>
      )}
      {showActors && (
        <FollowListModal
          title="New followers"
          players={echo.actors}
          onClose={() => setShowActors(false)}
        />
      )}
    </>
  );
}

const FILTER_LABELS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "comments", label: "Comments" },
  { value: "likes", label: "Likes" },
  { value: "followers", label: "Followers" },
];

export default function Echoes() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: echoes = [] } = useQuery({ queryKey: ["echoes"], queryFn: getEchoes });

  const markReadMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["echoes"] }),
  });

  // Mark all read as soon as the panel opens.
  useEffect(() => {
    markReadMutation.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = echoes.filter((e) => {
    if (filter === "comments") return e.type === "new_comment";
    if (filter === "likes") return e.type === "new_like";
    if (filter === "followers") return e.type === "new_follower";
    return true;
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Echoes</h1>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1">
        {FILTER_LABELS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
              filter === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Echo list */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {visible.length > 0 ? (
          <div className="divide-y divide-border">
            {visible.map((echo) => (
              <EchoRow key={echo.id} echo={echo} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No {filter === "all" ? "" : filter} echoes yet.
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
