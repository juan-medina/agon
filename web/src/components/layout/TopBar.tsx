// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { Moon, Sun, User } from "lucide-react";
import { NavLink } from "react-router";
import { useTheme } from "@/hooks/useTheme";

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border px-6">
      <button
        onClick={toggleTheme}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <NavLink
        to="/hero"
        className={({ isActive }) =>
          `flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`
        }
        aria-label="Your hero"
      >
        <User size={16} />
      </NavLink>
    </header>
  );
}
