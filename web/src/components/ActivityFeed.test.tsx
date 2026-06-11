// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { JOURNEYS, PLAYERS } from "@/test/fixtures";
import ActivityFeed from "./ActivityFeed";
import type { FeedItem } from "@/models";

function renderFeed(items: FeedItem[]) {
  return render(
    <MemoryRouter>
      <ActivityFeed items={items} emptyState={<p>Nothing here yet.</p>} />
    </MemoryRouter>,
  );
}

describe("ActivityFeed", () => {
  it("renders the empty state when there are no items", () => {
    renderFeed([]);
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("renders journey and activity items", () => {
    const items: FeedItem[] = [
      { kind: "journey", journey: JOURNEYS[0] },
      {
        kind: "activity",
        activity: {
          type: "follow",
          createdAt: new Date("2026-06-01T12:00:00Z"),
          actor: PLAYERS[0],
          recipient: PLAYERS[1],
        },
      },
    ];
    renderFeed(items);

    expect(screen.getByText(JOURNEYS[0].game)).toBeInTheDocument();
    expect(screen.getByText(/started following/i)).toBeInTheDocument();
    expect(screen.queryByText("Nothing here yet.")).not.toBeInTheDocument();
  });
});
