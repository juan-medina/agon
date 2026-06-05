// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import "@/i18n";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("marks the active route link as current and leaves others unmarked", () => {
    render(
      <MemoryRouter initialEntries={["/journeys"]}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Journeys" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Realm" })).not.toHaveAttribute("aria-current", "page");
  });
});
