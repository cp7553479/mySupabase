"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { DraftInquiry } from "@/lib/inquiries/queries";

type DraftInquiryListProps = { inquiry: DraftInquiry | null; locale: string };

function formatPrice(
  amount: number,
  currencyCode: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

export function DraftInquiryList({
  inquiry,
  locale,
}: Readonly<DraftInquiryListProps>) {
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const copy =
    locale === "zh"
      ? {
          empty:
            "你的询单列表还是空的。浏览商品并完成配置后，可以把商品加入这里。",
          estimated: "当前预估",
          itemCount: "项商品",
          remove: "移除",
          removeError: "暂时无法移除此商品，请稍后重试。",
          selectedOptions: "已选配置",
        }
      : {
          empty:
            "Your enquiry list is empty. Browse the catalogue and configure a product to add it here.",
          estimated: "Current estimate",
          itemCount: "items",
          remove: "Remove",
          removeError: "This product could not be removed. Please try again.",
          selectedOptions: "Selected options",
        };

  async function removeItem(itemId: string) {
    setRemovingItemId(itemId);
    setMessage(null);
    const response = await fetch(`/api/inquiry-items/${itemId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage(copy.removeError);
      setRemovingItemId(null);
      return;
    }

    router.refresh();
  }

  if (!inquiry || inquiry.items.length === 0) {
    return <p className="text-muted-foreground mt-8 leading-7">{copy.empty}</p>;
  }

  const estimatedTotal = inquiry.items.reduce(
    (sum, item) => sum + (item.estimatedTotal ?? 0),
    0,
  );
  const currencyCode = inquiry.items[0]?.currencyCode;

  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{inquiry.number}</p>
        <p className="text-sm font-medium">
          {inquiry.items.length} {copy.itemCount}
        </p>
      </div>
      <div className="divide-y rounded-xl border">
        {inquiry.items.map((item) => (
          <article className="space-y-4 p-5" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-sm">
                  {item.productNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{item.name}</h2>
              </div>
              <Button
                disabled={removingItemId === item.id}
                onClick={() => removeItem(item.id)}
                type="button"
                variant="ghost"
              >
                {copy.remove}
              </Button>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <span>{item.quantity.toLocaleString()}</span>
              {item.unitPrice !== null ? (
                <span>
                  {formatPrice(item.unitPrice, item.currencyCode, locale)}
                </span>
              ) : null}
            </div>
            {item.options.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                {copy.selectedOptions}: {item.options.join(" · ")}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      {currencyCode ? (
        <p className="text-right text-sm font-semibold">
          {copy.estimated}: {formatPrice(estimatedTotal, currencyCode, locale)}
        </p>
      ) : null}
      {message ? <p className="text-destructive text-sm">{message}</p> : null}
    </div>
  );
}
