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

const proofPoints = [
  "Customisable products",
  "Quantity-based pricing",
  "Dedicated enquiry support",
];

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
      <section className="overflow-hidden border-b">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center gap-7">
            <Badge className="w-fit" variant="secondary">
              <SparklesIcon data-icon="inline-start" />
              {copy.heroEyebrow}
            </Badge>
            <div className="flex flex-col gap-5">
              <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
                {copy.heroTitle}
              </h1>
              <p className="text-muted-foreground max-w-lg text-lg leading-8">
                {copy.heroDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`${prefix}/products`}>
                  {copy.browseProducts}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`${prefix}/services`}>{copy.learnMore}</Link>
              </Button>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {proofPoints.map((point) => (
                <span className="flex items-center gap-2" key={point}>
                  <CheckIcon
                    className="text-foreground size-4"
                    aria-hidden="true"
                  />
                  {point}
                </span>
              ))}
            </div>
          </div>
          <div className="relative flex min-h-90 overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_24%_22%,oklch(0.95_0.03_83),transparent_25%),radial-gradient(circle_at_75%_30%,oklch(0.86_0.08_88),transparent_28%),linear-gradient(135deg,oklch(0.98_0.01_90),oklch(0.89_0.04_75))] p-6 lg:min-h-132 lg:p-10">
            <div className="bg-background/80 relative z-10 mt-auto max-w-sm rounded-2xl border border-black/10 p-6 shadow-sm backdrop-blur">
              <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
                LogoPress
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                Built for product ideas that need a considered finish.
              </p>
            </div>
            <div className="bg-background/70 absolute top-10 right-8 size-36 rotate-12 rounded-[2rem] border border-black/10 shadow-xl" />
            <div className="bg-foreground/90 absolute right-24 bottom-12 size-32 -rotate-12 rounded-full border border-black/10 shadow-xl" />
            <div className="bg-background/90 absolute top-1/2 right-1/3 size-20 rotate-45 rounded-3xl border border-black/10 shadow-lg" />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
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
