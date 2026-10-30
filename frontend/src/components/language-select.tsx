"use client";
import { useApp } from "./provider";
import { localeNames } from "@/lib/i18n";
export function LanguageSelect() {
  const { t, preferences, setPreferences } = useApp();
  return (
    <select
      aria-label={t("language")}
      value={preferences.locale}
      onChange={(event) => {
        const locale = event.target.value;
        if (locale === "uz" || locale === "en" || locale === "ru")
          setPreferences((previous) => ({ ...previous, locale }));
      }}
    >
      {Object.entries(localeNames).map(([locale, label]) => (
        <option key={locale} value={locale}>
          {label}
        </option>
      ))}
    </select>
  );
}
