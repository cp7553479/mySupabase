import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CookieConsent } from "@/components/privacy/cookie-consent";
import { isLocale, locales } from "@/lib/i18n";
import { getPublicSiteData } from "@/lib/site/queries";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const site = await getPublicSiteData(locale);
  const canonicalPath = `/${locale}`;
  const title = site.defaultSeoTitle ?? site.siteName;
  const description = site.defaultSeoDescription ?? "";

  return {
    alternates: {
      canonical: canonicalPath,
      languages: { en: "/en", zh: "/zh" },
    },
    description,
    openGraph: {
      description,
      locale,
      siteName: site.siteName,
      title,
      type: "website",
    },
    title,
  };
}

export default async function PublicLocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const site = await getPublicSiteData(requestedLocale);

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        locale={requestedLocale}
        navigation={site.primaryNavigation}
        siteName={site.siteName}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={requestedLocale} site={site} />
      <CookieConsent locale={requestedLocale} />
    </div>
  );
}
