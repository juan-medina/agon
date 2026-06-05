// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { Link } from "react-router";
import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <Compass size={32} className="text-muted-foreground" />
      <div>
        <p className="text-4xl font-bold text-muted-foreground">404</p>
        <p className="mt-2 font-semibold">{t("not_found_title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("not_found_desc")}</p>
      </div>
      <Link
        to="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("not_found_back")}
      </Link>
    </div>
  );
}
