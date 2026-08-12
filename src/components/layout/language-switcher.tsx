"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguagesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type Locale, locales } from "@/lib/i18n";

const labels: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
};

function replaceLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  segments[1] = locale;
  return segments.join("/");
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1" aria-label="Language">
      <LanguagesIcon
        className="text-muted-foreground size-4"
        aria-hidden="true"
      />
      {locales.map((candidate) => (
        <Button
          key={candidate}
          asChild
          aria-current={candidate === locale ? "page" : undefined}
          size="sm"
          variant={candidate === locale ? "secondary" : "ghost"}
        >
          <Link href={replaceLocale(pathname, candidate)}>
            {labels[candidate]}
          </Link>
        </Button>
      ))}
    </div>
  );
}
