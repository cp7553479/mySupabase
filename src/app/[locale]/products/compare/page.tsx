import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductComparison } from "@/components/catalogue/product-comparison";
import { Button } from "@/components/ui/button";
import { getPublishedCatalogueProductDetails } from "@/lib/catalogue/queries";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ProductComparisonPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const products = await getPublishedCatalogueProductDetails(locale);
  const copy =
    locale === "zh"
      ? {
          back: "返回商品目录",
          eyebrow: "商品对比",
          title: "根据关键采购信息比较商品。",
        }
      : {
          back: "Back to catalogue",
          eyebrow: "Product comparison",
          title: "Compare the details that guide procurement.",
        };

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-5 py-12 lg:px-8 lg:py-20">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/products`}>{copy.back}</Link>
      </Button>
      <header className="max-w-3xl space-y-4">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {copy.title}
        </h1>
      </header>
      <ProductComparison locale={locale} products={products} />
    </section>
  );
}
