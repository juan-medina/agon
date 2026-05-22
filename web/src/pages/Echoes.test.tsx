// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { MOCK_ECHOES } from "@/lib/mock";
import Echoes from "./Echoes";

function renderEchoes() {
  return render(
    <MemoryRouter>
      <Echoes />
    </MemoryRouter>,
  );
}

describe("Echoes", () => {
  it("Comments filter hides follower echoes", async () => {
    const user = userEvent.setup();
    renderEchoes();
    await user.click(screen.getByRole("button", { name: "Comments" }));
    expect(screen.queryByText(/started following you/)).not.toBeInTheDocument();
  });

  it("Followers filter hides comment echoes", async () => {
    const user = userEvent.setup();
    renderEchoes();
    await user.click(screen.getByRole("button", { name: "Followers" }));
    expect(screen.queryByText(/commented on your/)).not.toBeInTheDocument();
  });

  it("clicking Mark all read disables the button", async () => {
    const user = userEvent.setup();
    renderEchoes();
    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(screen.getByRole("button", { name: "Mark all read" })).toBeDisabled();
  });

  it("comment echo links to its journey", () => {
    renderEchoes();
    const firstComment = MOCK_ECHOES.find((e) => e.kind === "comment")!;
    const link = screen
      .getAllByRole("link")
      .find((el) => el.textContent?.includes("commented on your"))!;
    expect(link).toHaveAttribute("href", `/journey/${firstComment.sessionId}`);
  });

  it("follower echo links to the follower's player profile", () => {
    renderEchoes();
    const firstFollower = MOCK_ECHOES.find((e) => e.kind === "follower")!;
    const link = screen
      .getAllByRole("link")
      .find((el) => el.textContent?.includes("started following you"))!;
    expect(link).toHaveAttribute("href", `/player/${firstFollower.player.handle}`);
  });
});
