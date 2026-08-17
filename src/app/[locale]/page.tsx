import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, SparklesIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCopy, isLocale } from "@/lib/i18n";
import { getPublishedHomeSections } from "@/lib/site/queries";

export const dynamic = "force-dynamic";

const proofPoints = {
  en: [
    "Customisable products",
    "Quantity-based pricing",
    "Dedicated enquiry support",
  ],
  zh: ["支持定制选项", "按数量分层报价", "专人询单支持"],
};

export default async function LocaleHomePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getCopy(locale);
  const prefix = `/${locale}`;
  const sections = await getPublishedHomeSections(locale);

  return (
    <>
      <section className="bg-foreground text-background relative isolate overflow-hidden border-b">
        <Image
          alt="Custom-product samples prepared for a LogoPress enquiry"
          className="object-cover"
          fill
          preload
          sizes="100vw"
          src="/brand/logopress-hero.png"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto flex min-h-135 max-w-4xl flex-col items-center justify-center gap-7 px-5 py-20 text-center lg:min-h-170 lg:px-8 lg:py-28">
          <div className="flex flex-col items-center gap-7">
            <Badge className="w-fit" variant="secondary">
              <SparklesIcon data-icon="inline-start" />
              {copy.heroEyebrow}
            </Badge>
            <div className="flex max-w-3xl flex-col gap-5">
              <h1 className="text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
                {copy.heroTitle}
              </h1>
              <p className="text-background/85 text-lg leading-8 sm:text-xl">
                {copy.heroDescription}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href={`${prefix}/products`}>
                  {copy.browseProducts}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                className="border-background/70 text-background hover:bg-background/15 hover:text-background bg-transparent"
                size="lg"
                variant="outline"
              >
                <Link href={`${prefix}/services`}>{copy.learnMore}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-background border-b">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-7 sm:grid-cols-3 lg:px-8">
          {proofPoints[locale].map((point) => (
            <div
              className="flex items-center justify-center gap-2 text-center text-sm font-medium"
              key={point}
            >
              <CheckIcon className="size-4" aria-hidden="true" />
              {point}
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex max-w-2xl flex-col gap-4">
              <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
                How LogoPress works
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                A clearer route from idea to a tailored quote.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                [
                  "Explore",
                  "Browse categories, product details, options and quantity tiers.",
                ],
                [
                  "Configure",
                  "Select quantities and requirements that fit your brief.",
                ],
                [
                  "Enquire",
                  "Submit a structured request for a considered response.",
                ],
              ].map(([title, description], index) => (
                <Card key={title}>
                  <CardHeader>
                    <CardDescription>0{index + 1}</CardDescription>
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm leading-6">
                    {description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div className="bg-muted relative aspect-[3/2] overflow-hidden rounded-3xl border">
            <Image
              alt="A selection of unbranded custom-product samples, materials and a design proof"
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              src="/brand/logopress-application-scene.png"
            />
          </div>
        </div>
      </section>
      <section className="bg-secondary/45 border-t">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-16 md:grid-cols-2 lg:px-8 lg:py-24">
          {sections.map((section) => (
            <Card className="bg-background" key={section.title}>
              <CardHeader className="gap-3">
                {section.eyebrow ? (
                  <CardDescription className="font-semibold tracking-[0.14em] uppercase">
                    {section.eyebrow}
                  </CardDescription>
                ) : null}
                <CardTitle className="text-2xl">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground flex flex-col items-start gap-5 text-sm leading-6">
                <p>{section.description}</p>
                {section.ctaLabel && section.ctaPath ? (
                  <Button asChild variant="outline">
                    <Link href={`${prefix}${section.ctaPath}`}>
                      {section.ctaLabel}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
