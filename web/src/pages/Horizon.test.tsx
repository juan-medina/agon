// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { MOCK_HORIZON } from "@/test/fixtures";
import { renderWithProviders } from "@/test/utils";
import Horizon from "./Horizon";

function renderHorizon() {
  return renderWithProviders(
    <MemoryRouter>
      <Horizon />
    </MemoryRouter>,
  );
}

describe("Horizon", () => {
  it("shows the player's horizon entries", async () => {
    renderHorizon();
    expect(await screen.findByText(MOCK_HORIZON[0].name)).toBeInTheDocument();
  });

  it("shows the empty-state copy when the player's horizon has no entries", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.endsWith("/api/me") && method === "GET") {
        return new Response(
          JSON.stringify({ id: "me", handle: "tester", name: "Tester", color: "#ff0000" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/horizon") && method === "GET") {
        return new Response(JSON.stringify({ entries: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("not found", { status: 404 });
    }));
    renderHorizon();
    expect(await screen.findByText(/place for your future journeys/i)).toBeInTheDocument();
  });

  it("shows a sign-in prompt for anonymous users", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith("/api/me")) return new Response("unauthorized", { status: 401 });
      return new Response("not found", { status: 404 });
    }));
    renderHorizon();
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("removing an entry takes it off the list", async () => {
    const user = userEvent.setup();
    renderHorizon();
    const removeButton = await screen.findByRole("button", { name: /remove from horizon/i });
    await user.click(removeButton);
    await waitFor(() => expect(screen.queryByText(MOCK_HORIZON[0].name)).not.toBeInTheDocument());
    expect(await screen.findByText(/place for your future journeys/i)).toBeInTheDocument();
  });
});
