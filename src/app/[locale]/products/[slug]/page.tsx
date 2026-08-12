import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedCatalogueProductBySlug } from "@/lib/catalogue/queries";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function formatPrice(amount: number, currencyCode: string, locale: string) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

export default async function ProductDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; slug: string }> }>) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const product = await getPublishedCatalogueProductBySlug(locale, slug);

  if (!product) {
    notFound();
  }

  const copy =
    locale === "zh"
      ? {
          back: "返回商品目录",
          description: "商品说明",
          enquiry: "加入询单列表",
          moq: "起订量",
          price: "数量阶梯价格",
          quantity: "数量",
        }
      : {
          back: "Back to catalogue",
          description: "Product overview",
          enquiry: "Add to enquiry list",
          moq: "Minimum order quantity",
          price: "Quantity-tier pricing",
          quantity: "Quantity",
        };

  return (
    <article className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/products`}>{copy.back}</Link>
      </Button>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:gap-16">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-xl">
          {product.primaryImage ? (
            <Image
              alt={product.primaryImage.altText ?? product.name}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              src={product.primaryImage.url}
              unoptimized
            />
          ) : null}
        </div>
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge variant="secondary">{product.productNumber}</Badge>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {product.name}
            </h1>
            {product.summary ? (
              <p className="text-muted-foreground text-lg leading-8">
                {product.summary}
              </p>
            ) : null}
          </div>
          {product.minimumOrderQuantity ? (
            <dl className="border-border border-y py-5">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{copy.moq}</dt>
                <dd className="font-semibold">
                  {product.minimumOrderQuantity.toLocaleString()}
                </dd>
              </div>
            </dl>
          ) : null}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{copy.price}</h2>
            <div className="divide-y rounded-lg border">
              {product.priceTiers.map((tier) => (
                <div
                  className="flex items-center justify-between gap-4 px-4 py-3"
                  key={tier.minimumQuantity}
                >
                  <span className="text-muted-foreground text-sm">
                    {tier.maximumQuantity
                      ? `${tier.minimumQuantity.toLocaleString()}–${tier.maximumQuantity.toLocaleString()}`
                      : `${tier.minimumQuantity.toLocaleString()}+`}{" "}
                    {copy.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(tier.unitPrice, product.currencyCode, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/${locale}/inquiry`}>{copy.enquiry}</Link>
          </Button>
        </div>
      </div>
      {product.description ? (
        <section className="mt-20 max-w-3xl space-y-4">
          <h2 className="text-2xl font-semibold">{copy.description}</h2>
          <p className="text-muted-foreground leading-8">
            {product.description}
          </p>
        </section>
      ) : null}
    </article>
  );
}
