import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getPublishedContentBySlug } from "@/lib/content/queries";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ResourceDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; slug: string }> }>) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const [caseStudy, resource] = await Promise.all([
    getPublishedContentBySlug("case_study", locale, slug),
    getPublishedContentBySlug("resource", locale, slug),
  ]);
  const entry = caseStudy ?? resource;

  if (!entry) {
    notFound();
  }

  const copy =
    locale === "zh"
      ? { back: "返回资料中心", label: caseStudy ? "案例" : "资料" }
      : {
          back: "Back to resources",
          label: caseStudy ? "Case study" : "Resource",
        };
  const downloadLabel = locale === "zh" ? "下载资料" : "Download resource";

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/resources`}>{copy.back}</Link>
      </Button>
      <p className="text-muted-foreground mt-10 text-sm font-semibold tracking-[0.16em] uppercase">
        {copy.label}
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
        {entry.title}
      </h1>
      {entry.excerpt ? (
        <p className="text-muted-foreground mt-6 text-xl leading-8">
          {entry.excerpt}
        </p>
      ) : null}
      <div className="mt-10 text-lg leading-8 whitespace-pre-line">
        {entry.body}
      </div>
      {entry.attachments.length > 0 ? (
        <section className="mt-10 space-y-3 rounded-xl border p-5">
          {entry.attachments.map((attachment) => (
            <Button asChild key={attachment.url} variant="outline">
              <a href={attachment.url}>{attachment.title ?? downloadLabel}</a>
            </Button>
          ))}
        </section>
      ) : null}
    </article>
  );
}
