"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { CatalogueProductDetail } from "@/lib/catalogue/queries";
import {
  readComparison,
  storageKey,
  subscribeToComparison,
} from "@/components/catalogue/compare-button";

const emptyComparison: string[] = [];

function formatPrice(amount: number, currencyCode: string, locale: string) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

export function ProductComparison({
  locale,
  products,
}: Readonly<{ locale: string; products: CatalogueProductDetail[] }>) {
  const selectedIds = useSyncExternalStore(
    subscribeToComparison,
    readComparison,
    () => emptyComparison,
  );
  const selectedProducts = useMemo(
    () =>
      selectedIds
        .map((id) => products.find((product) => product.id === id))
        .filter(
          (product): product is CatalogueProductDetail => product !== undefined,
        ),
    [products, selectedIds],
  );
  const copy =
    locale === "zh"
      ? {
          add: "浏览商品目录",
          empty:
            "从商品详情页将两个或以上商品加入对比，便于核对规格、起订量、价格和服务。",
          moq: "起订量",
          price: "最低阶梯单价",
          remove: "移除",
          services: "可用服务",
          specifications: "主要规格",
          view: "查看商品",
        }
      : {
          add: "Browse catalogue",
          empty:
            "Add two or more products from their detail pages to compare specifications, minimum order quantities, pricing and services.",
          moq: "Minimum order quantity",
          price: "Starting tier price",
          remove: "Remove",
          services: "Available services",
          specifications: "Key specifications",
          view: "View product",
        };

  function remove(productId: string) {
    const next = selectedIds.filter((id) => id !== productId);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("logopress-comparison-updated"));
  }

  if (selectedProducts.length < 2) {
    return (
      <div className="space-y-5 rounded-xl border p-8">
        <p className="text-muted-foreground">{copy.empty}</p>
        <Button asChild>
          <Link href={`/${locale}/products`}>{copy.add}</Link>
        </Button>
      </div>
    );
  }

  const rows = [
    {
      label: copy.moq,
      value: (product: CatalogueProductDetail) =>
        product.minimumOrderQuantity?.toLocaleString() ?? "—",
    },
    {
      label: copy.price,
      value: (product: CatalogueProductDetail) =>
        product.priceTiers[0]
          ? formatPrice(
              product.priceTiers[0].unitPrice,
              product.currencyCode,
              locale,
            )
          : "—",
    },
    {
      label: copy.services,
      value: (product: CatalogueProductDetail) =>
        product.services.length ? product.services.join(" · ") : "—",
    },
    {
      label: copy.specifications,
      value: (product: CatalogueProductDetail) =>
        product.specifications
          .slice(0, 4)
          .map(
            (item) =>
              `${item.name}: ${item.value}${item.unit ? ` ${item.unit}` : ""}`,
          )
          .join(" · ") || "—",
    },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[47.5rem] text-left text-sm">
        <thead className="bg-muted/50 align-top">
          <tr>
            <th className="w-48 p-5 font-medium" scope="col">
              &nbsp;
            </th>
            {selectedProducts.map((product) => (
              <th className="min-w-64 p-5" key={product.id} scope="col">
                <p className="text-lg font-semibold">{product.name}</p>
                <p className="text-muted-foreground mt-1 font-normal">
                  {product.productNumber}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/${locale}/products/${product.slug}`}>
                      {copy.view}
                    </Link>
                  </Button>
                  <Button
                    onClick={() => remove(product.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {copy.remove}
                  </Button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t" key={row.label}>
              <th className="bg-muted/30 p-5 font-medium" scope="row">
                {row.label}
              </th>
              {selectedProducts.map((product) => (
                <td
                  className="text-muted-foreground p-5 leading-6"
                  key={product.id}
                >
                  {row.value(product)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
