import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductCard } from "@/components/catalogue/product-card";
import { Button } from "@/components/ui/button";
import { getPublishedCatalogueProducts } from "@/lib/catalogue/queries";
import { isLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SavedProductsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (typeof userId !== "string") {
    redirect(`/${locale}/account`);
  }

  const { data: favorites } = await supabase
    .from("product_favorites")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const savedIds = new Set(favorites?.map((favorite) => favorite.product_id));
  const products = (await getPublishedCatalogueProducts(locale)).filter(
    (product) => savedIds.has(product.id),
  );
  const copy =
    locale === "zh"
      ? {
          back: "返回账户",
          browse: "浏览商品目录",
          empty: "尚未收藏商品。",
          title: "我的收藏",
        }
      : {
          back: "Back to account",
          browse: "Browse catalogue",
          empty: "You have not saved any products yet.",
          title: "Saved products",
        };

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-5 py-12 lg:px-8 lg:py-20">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/account`}>{copy.back}</Link>
      </Button>
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {copy.title}
        </h1>
      </header>
      {products.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} locale={locale} product={product} />
          ))}
        </div>
      ) : (
        <div className="space-y-5 rounded-xl border p-8">
          <p className="text-muted-foreground">{copy.empty}</p>
          <Button asChild>
            <Link href={`/${locale}/products`}>{copy.browse}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
