import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n";
import { getPublishedArticleBySlug } from "@/lib/content/queries";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: Readonly<{ params: Promise<{ locale: string; slug: string }> }>) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const article = await getPublishedArticleBySlug(locale, slug);

  if (!article) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/insights`}>
          <ArrowLeftIcon data-icon="inline-start" />
          All insights
        </Link>
      </Button>
      <p className="text-muted-foreground mt-10 text-sm">
        {article.publishedAt?.slice(0, 10)}
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
        {article.title}
      </h1>
      {article.excerpt ? (
        <p className="text-muted-foreground mt-6 text-xl leading-8">
          {article.excerpt}
        </p>
      ) : null}
      <div className="mt-10 text-lg leading-8 whitespace-pre-line">
        {article.body}
      </div>
    </article>
  );
}
