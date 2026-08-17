import Image from "next/image";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { getCopy, type Locale } from "@/lib/i18n";
import type { PublicSiteData, SiteNavigationItem } from "@/lib/site/queries";

function toLocalizedPath(locale: Locale, item: SiteNavigationItem) {
  return item.targetType === "path"
    ? `/${locale}${item.targetPath}`
    : item.targetPath;
}

export function SiteFooter({
  locale,
  site,
}: {
  locale: Locale;
  site: PublicSiteData;
}) {
  const copy = getCopy(locale);

  return (
    <footer className="bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="flex max-w-sm flex-col gap-4">
          <Image
            alt={site.siteName}
            className="h-auto w-40"
            height={151}
            src="/brand/logopress-black.png"
            unoptimized
            width={752}
          />
          <p className="text-muted-foreground text-sm leading-6">
            {copy.footerDescription}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-semibold">{copy.products}</p>
          {site.footerCatalogue.map((item) => (
            <Link
              className="text-muted-foreground hover:text-foreground"
              href={toLocalizedPath(locale, item)}
              key={item.label}
              target={item.openInNewTab ? "_blank" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-semibold">{site.siteName}</p>
          {site.footerCompany.map((item) => (
            <Link
              className="text-muted-foreground hover:text-foreground"
              href={toLocalizedPath(locale, item)}
              key={item.label}
              target={item.openInNewTab ? "_blank" : undefined}
            >
              {item.label}
            </Link>
          ))}
          {site.contactEmail ? (
            <a
              className="text-muted-foreground hover:text-foreground"
              href={`mailto:${site.contactEmail}`}
            >
              {site.contactEmail}
            </a>
          ) : null}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Separator />
        <p className="text-muted-foreground py-5 text-xs">
          © {new Date().getFullYear()} {site.siteName}. {copy.trustLine}
        </p>
      </div>
    </footer>
  );
}
