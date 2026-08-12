"use client";

import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/catalogue/product-card";
import { ComparisonLink } from "@/components/catalogue/comparison-link";
import { Button } from "@/components/ui/button";
import type { CatalogueProduct } from "@/lib/catalogue/queries";

type CatalogueBrowserProps = {
  locale: string;
  products: CatalogueProduct[];
};

const pageSize = 12;

type SortMode = "name" | "price-asc" | "price-desc";

export function CatalogueBrowser({
  locale,
  products,
}: Readonly<CatalogueBrowserProps>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [attribute, setAttribute] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortMode>("name");
  const categories = useMemo(
    () =>
      [...new Set(products.flatMap((product) => product.categories))].sort(),
    [products],
  );
  const attributes = useMemo(
    () =>
      [
        ...new Map(
          products
            .flatMap((product) => product.filterAttributes)
            .map((item) => [JSON.stringify([item.name, item.value]), item]),
        ).values(),
      ].sort((left, right) =>
        `${left.name}: ${left.value}`.localeCompare(
          `${right.name}: ${right.value}`,
          locale,
        ),
      ),
    [locale, products],
  );
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return products
      .filter((product) => {
        const matchesCategory =
          !category || product.categories.includes(category);
        const matchesAttribute =
          !attribute ||
          product.filterAttributes.some(
            (item) => JSON.stringify([item.name, item.value]) === attribute,
          );
        const matchesQuery =
          !normalizedQuery ||
          [product.name, product.productNumber, product.summary]
            .filter((value): value is string => value !== null)
            .some((value) =>
              value.toLocaleLowerCase().includes(normalizedQuery),
            );

        return matchesAttribute && matchesCategory && matchesQuery;
      })
      .sort((left, right) => {
        if (sort === "price-asc") {
          return (
            (left.startingPrice ?? Infinity) - (right.startingPrice ?? Infinity)
          );
        }

        if (sort === "price-desc") {
          return (
            (right.startingPrice ?? -Infinity) -
            (left.startingPrice ?? -Infinity)
          );
        }

        return left.name.localeCompare(right.name, locale);
      });
  }, [attribute, category, locale, products, query, sort]);
  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedProducts = visibleProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const labels =
    locale === "zh"
      ? {
          all: "全部商品",
          attribute: "按属性筛选",
          allAttributes: "全部属性",
          empty: "没有符合当前条件的商品。",
          next: "下一页",
          pagination: "显示 {start}–{end}，共 {total} 个商品",
          previous: "上一页",
          search: "搜索商品或编号",
          sort: "排序方式",
          sortName: "名称",
          sortPriceAsc: "价格：从低到高",
          sortPriceDesc: "价格：从高到低",
        }
      : {
          all: "All products",
          attribute: "Filter by attribute",
          allAttributes: "All attributes",
          empty: "No products match the current selection.",
          next: "Next page",
          pagination: "Showing {start}–{end} of {total} products",
          previous: "Previous page",
          search: "Search products or product numbers",
          sort: "Sort products",
          sortName: "Name",
          sortPriceAsc: "Price: low to high",
          sortPriceDesc: "Price: high to low",
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
          onChange={(event) => {
            setPage(1);
            setQuery(event.target.value);
          }}
          placeholder={labels.search}
          type="search"
          value={query}
        />
      </label>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div
          aria-label="Product categories"
          className="flex flex-wrap gap-2"
          role="group"
        >
          <Button
            onClick={() => {
              setCategory(null);
              setPage(1);
            }}
            type="button"
            variant={category === null ? "default" : "outline"}
          >
            {labels.all}
          </Button>
          {categories.map((item) => (
            <Button
              key={item}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
              type="button"
              variant={category === item ? "default" : "outline"}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {attributes.length > 0 ? (
            <label className="flex items-center gap-3 text-sm font-medium">
              {labels.attribute}
              <select
                aria-label={labels.attribute}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                onChange={(event) => {
                  setAttribute(event.target.value || null);
                  setPage(1);
                }}
                value={attribute ?? ""}
              >
                <option value="">{labels.allAttributes}</option>
                {attributes.map((item) => {
                  const value = JSON.stringify([item.name, item.value]);
                  return (
                    <option key={value} value={value}>
                      {item.name}: {item.value}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-3 text-sm font-medium">
            {labels.sort}
            <select
              aria-label={labels.sort}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value as SortMode);
              }}
              value={sort}
            >
              <option value="name">{labels.sortName}</option>
              <option value="price-asc">{labels.sortPriceAsc}</option>
              <option value="price-desc">{labels.sortPriceDesc}</option>
            </select>
          </label>
        </div>
      </div>
      <ComparisonLink locale={locale} />
      {visibleProducts.length > 0 ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.productNumber}
                locale={locale}
                product={product}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm" role="status">
              {labels.pagination
                .replace("{start}", String((currentPage - 1) * pageSize + 1))
                .replace(
                  "{end}",
                  String(
                    Math.min(currentPage * pageSize, visibleProducts.length),
                  ),
                )
                .replace("{total}", String(visibleProducts.length))}
            </p>
            {pageCount > 1 ? (
              <div className="flex gap-2">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => current - 1)}
                  type="button"
                  variant="outline"
                >
                  {labels.previous}
                </Button>
                <Button
                  disabled={currentPage === pageCount}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                  variant="outline"
                >
                  {labels.next}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">{labels.empty}</p>
      )}
    </div>
  );
}
