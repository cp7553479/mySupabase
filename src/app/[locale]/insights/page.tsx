import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isLocale } from "@/lib/i18n";
import { getPublishedArticles } from "@/lib/content/queries";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const articles = await getPublishedArticles(locale);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="max-w-3xl space-y-5">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
          Insights
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
          Guidance for clearer custom-product decisions.
        </h1>
        <p className="text-muted-foreground text-lg leading-8">
          Product, quantity and customisation context for the first enquiry and
          the conversations that follow.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {articles.map((article) => (
          <Card key={article.slug}>
            <CardHeader>
              <CardDescription>
                {article.publishedAt?.slice(0, 10)}
              </CardDescription>
              <CardTitle className="text-2xl">{article.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-5">
              <p className="text-muted-foreground leading-7">
                {article.excerpt}
              </p>
              <Button asChild variant="outline">
                <Link href={`/${locale}/insights/${article.slug}`}>
                  Read article
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
