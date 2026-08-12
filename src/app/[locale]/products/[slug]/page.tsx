import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/catalogue/favorite-button";
import { CompareButton } from "@/components/catalogue/compare-button";
import { ProductConfigurator } from "@/components/catalogue/product-configurator";
import {
  getPublishedCatalogueProductBySlug,
  getPublishedCatalogueProductDetails,
} from "@/lib/catalogue/queries";
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

function formatLeadTime(
  minimumDays: number | null,
  maximumDays: number | null,
  locale: string,
) {
  const days = locale === "zh" ? "天" : "days";
  const pending = locale === "zh" ? "询价后确认" : "Confirmed with quotation";

  if (minimumDays !== null && maximumDays !== null) {
    return minimumDays === maximumDays
      ? `${minimumDays} ${days}`
      : `${minimumDays}–${maximumDays} ${days}`;
  }

  if (minimumDays !== null) return `${minimumDays}+ ${days}`;
  if (maximumDays !== null) return `${maximumDays} ${days}`;

  return pending;
}

export default async function ProductDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; slug: string }> }>) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const [product, catalogue] = await Promise.all([
    getPublishedCatalogueProductBySlug(locale, slug),
    getPublishedCatalogueProductDetails(locale),
  ]);

  if (!product) {
    notFound();
  }

  const relatedProducts = catalogue
    .filter((candidate) => product.relatedProductIds.includes(candidate.id))
    .sort(
      (left, right) =>
        product.relatedProductIds.indexOf(left.id) -
        product.relatedProductIds.indexOf(right.id),
    );
  const suggestedProducts =
    relatedProducts.length > 0
      ? relatedProducts
      : catalogue.filter(
          (candidate) =>
            candidate.id !== product.id &&
            candidate.categories.some((category) =>
              product.categories.includes(category),
            ),
        );

  const copy =
    locale === "zh"
      ? {
          back: "返回商品目录",
          description: "商品说明",
          enquiry: "加入询单列表",
          gallery: "商品图片",
          moq: "起订量",
          leadTime: "生产交期",
          price: "数量阶梯价格",
          quantity: "数量",
          related: "相关商品",
          services: "可用服务",
          specifications: "商品规格",
        }
      : {
          back: "Back to catalogue",
          description: "Product overview",
          enquiry: "Add to enquiry list",
          gallery: "Product images",
          moq: "Minimum order quantity",
          leadTime: "Production lead time",
          price: "Quantity-tier pricing",
          quantity: "Quantity",
          related: "Related products",
          services: "Available services",
          specifications: "Specifications",
        };

  return (
    <article className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/products`}>{copy.back}</Link>
      </Button>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:gap-16">
        <div className="space-y-4">
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
          {product.gallery.length > 1 ? (
            <section aria-label={copy.gallery}>
              <h2 className="sr-only">{copy.gallery}</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {product.gallery.slice(1).map((image) => (
                  <div
                    className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                    key={image.url}
                  >
                    <Image
                      alt={image.altText ?? product.name}
                      className="object-cover"
                      fill
                      sizes="(max-width: 640px) 30vw, 10rem"
                      src={image.url}
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge variant="secondary">{product.productNumber}</Badge>
            {product.categories.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                {product.categories.join(" · ")}
              </p>
            ) : null}
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
          <dl className="border-border border-y py-5">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{copy.leadTime}</dt>
              <dd className="font-semibold">
                {formatLeadTime(
                  product.productionLeadTimeMinDays,
                  product.productionLeadTimeMaxDays,
                  locale,
                )}
              </dd>
            </div>
          </dl>
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
          <ProductConfigurator
            locale={locale}
            minimumOrderQuantity={product.minimumOrderQuantity}
            optionGroups={product.optionGroups}
            productId={product.id}
            services={product.services}
          />
          <FavoriteButton locale={locale} productId={product.id} />
          <CompareButton locale={locale} productId={product.id} />
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
      {product.specifications.length > 0 ? (
        <section className="mt-16 max-w-3xl space-y-4">
          <h2 className="text-2xl font-semibold">{copy.specifications}</h2>
          <dl className="divide-y rounded-lg border">
            {product.specifications.map((specification) => (
              <div
                className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-6"
                key={`${specification.group}-${specification.name}`}
              >
                <dt className="text-muted-foreground">{specification.name}</dt>
                <dd>
                  {specification.value}
                  {specification.unit ? ` ${specification.unit}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {product.services.length > 0 ? (
        <section className="mt-16 max-w-3xl space-y-4">
          <h2 className="text-2xl font-semibold">{copy.services}</h2>
          <div className="flex flex-wrap gap-2">
            {product.services.map((service) => (
              <Badge key={service.code} variant="secondary">
                {service.name}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}
      {suggestedProducts.length > 0 ? (
        <section className="mt-16 space-y-5">
          <h2 className="text-2xl font-semibold">{copy.related}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedProducts.slice(0, 3).map((candidate) => (
              <Link
                className="group hover:bg-muted rounded-xl border p-4 transition-colors"
                href={`/${locale}/products/${candidate.slug}`}
                key={candidate.id}
              >
                {candidate.primaryImage ? (
                  <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      alt={candidate.primaryImage.altText ?? candidate.name}
                      className="object-cover transition-transform group-hover:scale-105"
                      fill
                      sizes="(max-width: 640px) 100vw, 20rem"
                      src={candidate.primaryImage.url}
                      unoptimized
                    />
                  </div>
                ) : null}
                <p className="mt-4 font-medium">{candidate.name}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {candidate.productNumber}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
