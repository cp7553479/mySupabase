"use client";

import Link from "next/link";
import { GitCompareArrowsIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  readComparison,
  subscribeToComparison,
} from "@/components/catalogue/compare-button";

export function ComparisonLink({ locale }: Readonly<{ locale: string }>) {
  const count = useSyncExternalStore(
    subscribeToComparison,
    () => readComparison().length,
    () => 0,
  );

  const label = locale === "zh" ? "对比商品" : "Compare products";

  return (
    <Button asChild variant="outline">
      <Link href={`/${locale}/products/compare`}>
        <GitCompareArrowsIcon />
        {label}
        {count ? ` (${count})` : ""}
      </Link>
    </Button>
  );
}
