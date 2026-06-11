// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import JourneyCard from "@/components/JourneyCard";
import ActivityItem from "@/components/ActivityItem";
import type { FeedItem } from "@/models";

interface ActivityFeedProps {
  items: FeedItem[];
  viewerId?: string;
  showPlayer?: boolean;
  emptyState: ReactNode;
}

export default function ActivityFeed({ items, viewerId, showPlayer, emptyState }: ActivityFeedProps) {
  if (items.length === 0) return <>{emptyState}</>;

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) =>
        item.kind === "journey" ? (
          <JourneyCard key={`journey-${item.journey.id}`} journey={item.journey} showPlayer={showPlayer} />
        ) : (
          <ActivityItem
            key={`activity-${item.activity.type}-${item.activity.actor.id}-${item.activity.createdAt.toISOString()}`}
            activity={item.activity}
            viewerId={viewerId}
          />
        ),
      )}
    </div>
  );
}
