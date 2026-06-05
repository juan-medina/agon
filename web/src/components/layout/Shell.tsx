// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useState } from "react";
import { Navigate, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentPlayer, SessionExpiredError } from "@/services/auth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Shell() {
  const { data: player, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentPlayer,
    retry: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) return null;
  if (error instanceof SessionExpiredError || !player) return <Navigate to="/lore" replace />;

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
