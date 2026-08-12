import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { CatalogueProduct } from "@/lib/catalogue/queries";

type ProductCardProps = {
  locale: string;
  product: CatalogueProduct;
};

function formatPrice(amount: number, currencyCode: string, locale: string) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

export function ProductCard({ locale, product }: Readonly<ProductCardProps>) {
  const labels =
    locale === "zh"
      ? { from: "起", details: "查看商品", moq: "起订量" }
      : { from: "from", details: "View product", moq: "MOQ" };

  return (
    <Card className="group flex h-full flex-col overflow-hidden py-0">
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {product.primaryImage ? (
          <Image
            alt={product.primaryImage.altText ?? product.name}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            src={product.primaryImage.url}
            unoptimized
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {product.name}
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary">{product.productNumber}</Badge>
          {product.minimumOrderQuantity ? (
            <span className="text-muted-foreground text-xs">
              {labels.moq} {product.minimumOrderQuantity.toLocaleString()}
            </span>
          ) : null}
        </div>
        {product.categories[0] ? (
          <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
            {product.categories[0]}
          </p>
        ) : null}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">
            {product.name}
          </h2>
          {product.summary ? (
            <p className="text-muted-foreground line-clamp-2 text-sm leading-6">
              {product.summary}
            </p>
          ) : null}
        </div>
        {product.startingPrice !== null ? (
          <p className="text-sm font-medium">
            {formatPrice(product.startingPrice, product.currencyCode, locale)}{" "}
            <span className="text-muted-foreground font-normal">
              {labels.from}
            </span>
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="pb-6">
        <Button asChild className="w-full" variant="outline">
          <Link href={`/${locale}/products/${product.slug}`}>
            {labels.details}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
