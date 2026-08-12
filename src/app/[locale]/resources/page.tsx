import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FaqBrowser } from "@/components/content/faq-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedContent } from "@/lib/content/queries";
import { isLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const isSignedIn = typeof claimsData?.claims.sub === "string";
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
          viewResource: "查看资料",
          memberContent: "登录后可访问仅向会员开放的资料、案例与采购支持内容。",
          signIn: "登录查看会员资料",
        }
      : {
          cases: "Case studies",
          faq: "Frequently asked questions",
          resources: "Resources",
          cta: "Browse catalogue",
          details: "View details",
          viewResource: "Open resource",
          memberContent:
            "Sign in to access member-only resources, cases and procurement support content.",
          signIn: "Sign in for member resources",
        };
  const sections = [
    { entries: cases, title: copy.cases },
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
      {!isSignedIn ? (
        <aside className="bg-muted/40 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
          <p className="text-muted-foreground max-w-2xl text-sm leading-6">
            {copy.memberContent}
          </p>
          <Button asChild variant="outline">
            <Link href={`/${locale}/account`}>{copy.signIn}</Link>
          </Button>
        </aside>
      ) : null}
      {sections.map(({ entries, title }) => (
        <section className="space-y-5" key={title}>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {entries.map((entry) => (
              <Card key={entry.slug}>
                {entry.coverImage ? (
                  <div className="bg-muted relative aspect-[16/9] overflow-hidden">
                    <Image
                      alt={entry.coverImage.altText ?? entry.title}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      src={entry.coverImage.url}
                      unoptimized
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle>{entry.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-7">
                    {entry.excerpt}
                  </p>
                  <Button asChild className="mt-5" variant="outline">
                    <Link href={`/${locale}/resources/${entry.slug}`}>
                      {entry.attachments.length > 0
                        ? copy.viewResource
                        : copy.details}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">{copy.faq}</h2>
        <FaqBrowser entries={faqs} locale={locale} />
      </section>
      <Button asChild>
        <Link href={`/${locale}/products`}>{copy.cta}</Link>
      </Button>
    </section>
  );
}
