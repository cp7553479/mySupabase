import { notFound } from "next/navigation";

import { CatalogueBrowser } from "@/components/catalogue/catalogue-browser";
import { getPublishedCatalogueProducts } from "@/lib/catalogue/queries";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const products = await getPublishedCatalogueProducts(locale);
  const copy =
    locale === "zh"
      ? {
          eyebrow: "商品目录",
          summary: "浏览可定制商品，并以数量阶梯价格作为询单的起点。",
          title: "为下一次采购发现合适的商品。",
        }
      : {
          eyebrow: "Catalogue",
          summary:
            "Browse customisable products and use quantity-tier pricing as the starting point for an enquiry.",
          title: "Find a strong starting point for your next brief.",
        };

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="max-w-3xl space-y-5">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
          {copy.title}
        </h1>
        <p className="text-muted-foreground text-lg leading-8">
          {copy.summary}
        </p>
      </div>
      <CatalogueBrowser locale={locale} products={products} />
    </section>
  );
}
