import type { MetadataRoute } from "next";

import { getPublicSiteData } from "@/lib/site/queries";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getPublicSiteData("en");
  const origin = site.websiteUrl ?? "https://logopress.example";

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${origin}/sitemap.xml`,
  };
}
