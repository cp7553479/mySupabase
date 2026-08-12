"use client";

import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/catalogue/product-card";
import { Button } from "@/components/ui/button";
import type { CatalogueProduct } from "@/lib/catalogue/queries";

type CatalogueBrowserProps = {
  locale: string;
  products: CatalogueProduct[];
};

export function CatalogueBrowser({
  locale,
  products,
}: Readonly<CatalogueBrowserProps>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(
    () =>
      [...new Set(products.flatMap((product) => product.categories))].sort(),
    [products],
  );
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        !category || product.categories.includes(category);
      const matchesQuery =
        !normalizedQuery ||
        [product.name, product.productNumber, product.summary]
          .filter((value): value is string => value !== null)
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);
  const labels =
    locale === "zh"
      ? {
          all: "全部商品",
          empty: "没有符合当前条件的商品。",
          search: "搜索商品或编号",
        }
      : {
          all: "All products",
          empty: "No products match the current selection.",
          search: "Search products or product numbers",
        };

  return (
    <div className="mt-12 space-y-8">
      <label className="border-input bg-background flex max-w-xl items-center gap-3 rounded-md border px-3 py-2">
        <SearchIcon
          aria-hidden="true"
          className="text-muted-foreground size-4"
        />
        <input
          aria-label={labels.search}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.search}
          type="search"
          value={query}
        />
      </label>
      <div
        aria-label="Product categories"
        className="flex flex-wrap gap-2"
        role="group"
      >
        <Button
          onClick={() => setCategory(null)}
          type="button"
          variant={category === null ? "default" : "outline"}
        >
          {labels.all}
        </Button>
        {categories.map((item) => (
          <Button
            key={item}
            onClick={() => setCategory(item)}
            type="button"
            variant={category === item ? "default" : "outline"}
          >
            {item}
          </Button>
        ))}
      </div>
      {visibleProducts.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.productNumber}
              locale={locale}
              product={product}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{labels.empty}</p>
      )}
    </div>
  );
}
