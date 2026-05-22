// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { MOCK_OTHERS_ON_JOURNEY, SESSIONS } from "@/lib/mock";
import JourneyDetail from "./JourneyDetail";

function renderJourney(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/journey/${id}`]}>
      <Routes>
        <Route path="/journey/:id" element={<JourneyDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("JourneyDetail", () => {
  it("shows a not-found message for an unknown journey id", () => {
    renderJourney("does-not-exist");
    expect(screen.getByText("Journey not found.")).toBeInTheDocument();
  });

  it("renders the session game title for a known journey", () => {
    const session = SESSIONS.find((s) => s.id === "s1")!;
    renderJourney(session.id);
    expect(screen.getByRole("heading", { name: session.game })).toBeInTheDocument();
  });

  it("liking a journey increments the displayed count by one", async () => {
    const user = userEvent.setup();
    renderJourney("s1");
    const likeButton = screen.getByRole("button", { name: "Like" });
    const before = Number(likeButton.textContent);
    await user.click(likeButton);
    expect(Number(screen.getByRole("button", { name: "Unlike" }).textContent)).toBe(before + 1);
  });

  it("unliking restores the original count", async () => {
    const user = userEvent.setup();
    renderJourney("s1");
    const likeButton = screen.getByRole("button", { name: "Like" });
    const original = Number(likeButton.textContent);
    await user.click(likeButton);
    await user.click(screen.getByRole("button", { name: "Unlike" }));
    expect(Number(screen.getByRole("button", { name: "Like" }).textContent)).toBe(original);
  });

  it("Post button is disabled when the comment field is empty", () => {
    renderJourney("s1");
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("Post button enables once the comment field has text", async () => {
    const user = userEvent.setup();
    renderJourney("s1");
    await user.type(screen.getByPlaceholderText("Add a comment…"), "Great session!");
    expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
  });

  it("clicking 'See who liked this' opens the liked-by modal", async () => {
    const user = userEvent.setup();
    renderJourney("s1");
    await user.click(screen.getByRole("button", { name: "See who liked this" }));
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("shows Follow only for Others players, not Friends on this journey", () => {
    renderJourney("s1"); // s1 is my session — no owner Follow button
    expect(screen.getAllByRole("button", { name: "Follow" })).toHaveLength(
      MOCK_OTHERS_ON_JOURNEY.length,
    );
  });

  it("clicking Follow on an Others player toggles to Following", async () => {
    const user = userEvent.setup();
    renderJourney("s1");
    const [firstFollow] = screen.getAllByRole("button", { name: "Follow" });
    await user.click(firstFollow);
    expect(screen.getAllByRole("button", { name: "Follow" })).toHaveLength(
      MOCK_OTHERS_ON_JOURNEY.length - 1,
    );
  });

  it("shows Unfollow for an already-followed session owner", () => {
    // s2 belongs to Alex Torres who is in MOCK_FRIENDS_ON_JOURNEY
    renderJourney("s2");
    expect(screen.getByRole("button", { name: "Unfollow" })).toBeInTheDocument();
  });

  it("clicking Unfollow for the owner removes the Unfollow button", async () => {
    const user = userEvent.setup();
    renderJourney("s2");
    await user.click(screen.getByRole("button", { name: "Unfollow" }));
    expect(screen.queryByRole("button", { name: "Unfollow" })).not.toBeInTheDocument();
  });
});
