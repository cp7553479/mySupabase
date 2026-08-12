import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedContent } from "@/lib/content/queries";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [cases, faqs, resources] = await Promise.all([
    getPublishedContent("case_study", locale),
    getPublishedContent("faq", locale),
    getPublishedContent("resource", locale),
  ]);
  const copy =
    locale === "zh"
      ? {
          cases: "案例",
          faq: "常见问题",
          resources: "资料中心",
          cta: "浏览商品目录",
          details: "查看详情",
        }
      : {
          cases: "Case studies",
          faq: "Frequently asked questions",
          resources: "Resources",
          cta: "Browse catalogue",
          details: "View details",
        };
  const sections = [
    { entries: cases, title: copy.cases },
    { entries: faqs, title: copy.faq },
    { entries: resources, title: copy.resources },
  ];
  return (
    <section className="mx-auto max-w-7xl space-y-16 px-5 py-16 lg:px-8 lg:py-24">
      <header className="max-w-3xl space-y-5">
        <p className="text-muted-foreground text-sm font-semibold tracking-[.16em] uppercase">
          {copy.resources}
        </p>
        <h1 className="text-5xl font-semibold tracking-[-.04em] sm:text-6xl">
          {locale === "zh"
            ? "为清晰采购决策准备的内容。"
            : "Content for clearer purchasing decisions."}
        </h1>
      </header>
      {sections.map(({ entries, title }) => (
        <section className="space-y-5" key={title}>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {entries.map((entry) => (
              <Card key={entry.slug}>
                <CardHeader>
                  <CardTitle>{entry.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-7">
                    {entry.excerpt}
                  </p>
                  {title !== copy.faq ? (
                    <Button asChild className="mt-5" variant="outline">
                      <Link href={`/${locale}/resources/${entry.slug}`}>
                        {copy.details}
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
      <Button asChild>
        <Link href={`/${locale}/products`}>{copy.cta}</Link>
      </Button>
    </section>
  );
}
