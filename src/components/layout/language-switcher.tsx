"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, LanguagesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localePreferenceCookie, type Locale, locales } from "@/lib/i18n";

const labels: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
};

const languageNames: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
};

function replaceLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  segments[1] = locale;
  return segments.join("/");
}

function saveLocalePreference(locale: Locale) {
  document.cookie = `${localePreferenceCookie}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function selectLocale(candidate: Locale) {
    saveLocalePreference(candidate);
    router.push(replaceLocale(pathname, candidate));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Select language" size="sm" variant="ghost">
          <LanguagesIcon data-icon="inline-start" aria-hidden="true" />
          {labels[locale]}
          <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={locale}>
          {locales.map((candidate) => (
            <DropdownMenuRadioItem
              key={candidate}
              onSelect={() => selectLocale(candidate)}
              value={candidate}
            >
              {languageNames[candidate]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
