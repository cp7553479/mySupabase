import type { MetadataRoute } from "next";

import { getPublicSiteData } from "@/lib/site/queries";

const publicPages = [
  "",
  "/about",
  "/contact",
  "/services",
  "/insights",
  "/privacy",
  "/cookies",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getPublicSiteData("en");
  const origin = site.websiteUrl ?? "https://logopress.example";

  return ["en", "zh"].flatMap((locale) =>
    publicPages.map((path) => ({
      url: `${origin}/${locale}${path}`,
      lastModified: new Date(),
    })),
  );
}
