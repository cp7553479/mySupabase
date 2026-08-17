import Image from "next/image";
import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getCopy, type Locale } from "@/lib/i18n";
import type { SiteNavigationItem } from "@/lib/site/queries";

function toLocalizedPath(locale: Locale, item: SiteNavigationItem) {
  return item.targetType === "path"
    ? `/${locale}${item.targetPath}`
    : item.targetPath;
}

export function SiteHeader({
  locale,
  navigation,
  siteName,
}: {
  locale: Locale;
  navigation: SiteNavigationItem[];
  siteName: string;
}) {
  const copy = getCopy(locale);
  const prefix = `/${locale}`;

  return (
    <header className="bg-background/95 border-b backdrop-blur">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link className="shrink-0" href={prefix}>
          <Image
            alt={siteName}
            className="h-auto w-24"
            height={151}
            priority
            src="/brand/logopress-black.png"
            unoptimized
            width={752}
          />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {navigation.map((item) => (
            <Link
              className="hover:text-muted-foreground text-sm font-medium transition-colors"
              href={toLocalizedPath(locale, item)}
              key={item.label}
              target={item.openInNewTab ? "_blank" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher locale={locale} />
          <Button asChild size="sm" variant="ghost">
            <Link href={`${prefix}/account`}>{copy.signIn}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`${prefix}/inquiry`}>{copy.inquire}</Link>
          </Button>
        </div>
        <details className="group relative lg:hidden">
          <summary className="bg-background flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border [&::-webkit-details-marker]:hidden">
            <MenuIcon className="size-4" aria-hidden="true" />
            <span className="sr-only">Open navigation</span>
          </summary>
          <nav
            className="bg-popover absolute top-11 right-0 z-20 flex w-64 flex-col gap-1 rounded-xl border p-3 shadow-lg"
            aria-label="Mobile navigation"
          >
            {navigation.map((item) => (
              <Link
                className="hover:bg-muted rounded-md px-3 py-2 text-sm font-medium"
                href={toLocalizedPath(locale, item)}
                key={item.label}
                target={item.openInNewTab ? "_blank" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-1 border-t" />
            <LanguageSwitcher locale={locale} />
            <Button asChild className="mt-2" size="sm">
              <Link href={`${prefix}/inquiry`}>{copy.inquire}</Link>
            </Button>
          </nav>
        </details>
      </div>
    </header>
  );
}
