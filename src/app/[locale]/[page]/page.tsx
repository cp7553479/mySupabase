import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCopy, isLocale } from "@/lib/i18n";

const pageContent = {
  about: {
    eyebrow: "LogoPress",
    title: "Built for more confident custom-product sourcing.",
  },
  account: {
    eyebrow: "Member account",
    title: "Sign in to manage your saved products and enquiries.",
  },
  contact: {
    eyebrow: "Contact",
    title: "Tell us what you are planning to create.",
  },
  inquiry: {
    eyebrow: "Enquiry",
    title: "Build your enquiry from products and configurations.",
  },
  insights: {
    eyebrow: "Insights",
    title: "Guidance for custom products, sourcing and brand activation.",
  },
  products: {
    eyebrow: "Catalogue",
    title: "Find a product that is ready for your next brief.",
  },
  services: {
    eyebrow: "Services",
    title: "From product selection to considered support.",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(pageContent).flatMap((page) =>
    ["en", "zh"].map((locale) => ({ locale, page })),
  );
}

export default async function PublicPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; page: string }> }>) {
  const { locale, page } = await params;

  if (!isLocale(locale) || !(page in pageContent)) {
    notFound();
  }

  const content = pageContent[page as keyof typeof pageContent];
  const copy = getCopy(locale);

  return (
    <section className="mx-auto flex min-h-[60svh] max-w-7xl items-center px-5 py-16 lg:px-8 lg:py-24">
      <div className="flex max-w-3xl flex-col gap-6">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
          {content.eyebrow}
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
          {content.title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg leading-8">
          This section is ready for its managed content and the related product
          data. The public website framework, navigation and language routing
          are now in place.
        </p>
        <Button asChild className="w-fit" size="lg">
          <Link href={`/${locale}/inquiry`}>
            {copy.inquire}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
