"use client";

import { GitCompareArrowsIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const storageKey = "logopress_product_comparison";
const maximumProducts = 4;
export type ComparisonSelection = {
  category: string;
  productId: string;
};

let cachedComparisonRaw: string | null = null;
let cachedComparison: ComparisonSelection[] = [];

export function readComparison(): ComparisonSelection[] {
  try {
    const raw = window.localStorage.getItem(storageKey) ?? "[]";
    if (raw === cachedComparisonRaw) {
      return cachedComparison;
    }
    const value = JSON.parse(raw);
    cachedComparison = Array.isArray(value)
      ? value.filter(
          (item): item is ComparisonSelection =>
            typeof item === "object" &&
            item !== null &&
            typeof item.category === "string" &&
            typeof item.productId === "string",
        )
      : [];
    cachedComparisonRaw = raw;
    return cachedComparison;
  } catch {
    cachedComparisonRaw = null;
    cachedComparison = [];
    return cachedComparison;
  }
}

export function subscribeToComparison(onStoreChange: () => void) {
  window.addEventListener("logopress-comparison-updated", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("logopress-comparison-updated", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function CompareButton({
  category,
  locale,
  productId,
}: Readonly<{ category: string | null; locale: string; productId: string }>) {
  const included = useSyncExternalStore(
    subscribeToComparison,
    () => readComparison().some((item) => item.productId === productId),
    () => false,
  );
  const [message, setMessage] = useState<string | null>(null);
  const copy =
    locale === "zh"
      ? {
          add: "加入对比",
          category: "请选择同一主要分类下的商品进行对比。",
          limit: `最多比较 ${maximumProducts} 个商品。`,
          remove: "移出对比",
        }
      : {
          add: "Add to compare",
          category:
            "Choose products from the same primary category to compare.",
          limit: `Compare up to ${maximumProducts} products.`,
          remove: "Remove from compare",
        };

  function toggle() {
    const current = readComparison();
    const existing = current.some((item) => item.productId === productId);
    const currentCategory = current[0]?.category;

    if (
      !existing &&
      (!category || (currentCategory && currentCategory !== category))
    ) {
      setMessage(copy.category);
      return;
    }

    const next = existing
      ? current.filter((item) => item.productId !== productId)
      : current.length < maximumProducts
        ? [...current, { category, productId }]
        : null;

    if (!next) {
      setMessage(copy.limit);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setMessage(null);
    window.dispatchEvent(new Event("logopress-comparison-updated"));
  }

  return (
    <div className="space-y-2">
      <Button
        aria-pressed={included}
        onClick={toggle}
        type="button"
        variant="outline"
      >
        <GitCompareArrowsIcon />
        {included ? copy.remove : copy.add}
      </Button>
      {message ? <p className="text-destructive text-sm">{message}</p> : null}
    </div>
  );
}

export { storageKey };
