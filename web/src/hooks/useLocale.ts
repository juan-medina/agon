// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useState } from "react";
import i18next from "@/i18n";
import type { SupportedLocale } from "@/i18n";

export { SUPPORTED_LOCALES } from "@/i18n";
export type { SupportedLocale } from "@/i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<SupportedLocale | null>(() => {
    const stored = localStorage.getItem("locale");
    if (stored === "en" || stored === "es") return stored;
    return null;
  });

  function setLocale(lang: SupportedLocale | null) {
    if (lang === null) {
      localStorage.removeItem("locale");
      setLocaleState(null);
      const browser = navigator.language.split("-")[0].toLowerCase();
      i18next.changeLanguage(browser === "es" ? "es" : "en");
    } else {
      localStorage.setItem("locale", lang);
      setLocaleState(lang);
      i18next.changeLanguage(lang);
    }
  }

  return { locale, setLocale };
}
