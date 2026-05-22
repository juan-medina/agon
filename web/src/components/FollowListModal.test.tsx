// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { PLAYERS } from "@/lib/mock";
import FollowListModal from "./FollowListModal";

function renderModal(
  players: typeof PLAYERS,
  onClose = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <FollowListModal title="Followers" players={players} onClose={onClose} />
    </MemoryRouter>,
  );
}

describe("FollowListModal", () => {
  it("shows 'No one here yet.' when the list is empty", () => {
    renderModal([]);
    expect(screen.getByText("No one here yet.")).toBeInTheDocument();
  });

  it("shows player names when the list is not empty", () => {
    renderModal([PLAYERS[0], PLAYERS[1]]);
    expect(screen.getByText(PLAYERS[0].name)).toBeInTheDocument();
    expect(screen.getByText(PLAYERS[1].name)).toBeInTheDocument();
  });

  it("clicking Close calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal([PLAYERS[1]], onClose);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking a player item calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal([PLAYERS[1]], onClose);
    await user.click(screen.getByRole("link", { name: new RegExp(PLAYERS[1].name) }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
