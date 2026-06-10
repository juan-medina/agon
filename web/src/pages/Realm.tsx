// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { getFeedJourneys } from "@/services/feed";
import JourneyCard from "@/components/JourneyCard";

export default function Realm() {
  const { t } = useTranslation();
  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: getFeedJourneys,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) return null;

  if (journeys.length === 0) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col items-center justify-center py-24 gap-3 text-center">
        <p className="text-base">{t("realm_quiet")}</p>
        <p className="text-sm text-muted-foreground">{t("realm_follow_hint")}</p>
        <Link
          to="/players"
          className="mt-2 text-sm border border-border rounded-lg px-4 py-2 hover:bg-muted transition-colors"
        >
          {t("realm_discover")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-3">
        {journeys.map((journey) => (
          <JourneyCard key={journey.id} journey={journey} showPlayer />
        ))}
      </div>
    </div>
  );
}
