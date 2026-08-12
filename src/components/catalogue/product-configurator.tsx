"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CatalogueOptionGroup } from "@/lib/catalogue/queries";

type ProductConfiguratorProps = {
  locale: string;
  minimumOrderQuantity: number | null;
  optionGroups: CatalogueOptionGroup[];
  productId: string;
};

export function ProductConfigurator({
  locale,
  minimumOrderQuantity,
  optionGroups,
  productId,
}: Readonly<ProductConfiguratorProps>) {
  const [quantity, setQuantity] = useState(minimumOrderQuantity ?? 1);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const copy =
    locale === "zh"
      ? {
          add: "加入询单列表",
          quantity: "采购数量",
          required: "请完成必填配置后加入询单列表。",
          minimum: "数量未达到起订量。",
          signIn: "请先登录，再将商品加入询单列表。",
          success: "商品已加入草稿询单。",
        }
      : {
          add: "Add to enquiry list",
          quantity: "Quantity",
          required:
            "Complete the required configuration before adding this item.",
          minimum: "The quantity is below the minimum order quantity.",
          signIn: "Sign in before adding this product to your enquiry list.",
          success: "Product added to your draft enquiry.",
        };

  async function addToEnquiry() {
    if (minimumOrderQuantity && quantity < minimumOrderQuantity) {
      setMessage(copy.minimum);
      return;
    }

    const missingRequired = optionGroups.some(
      (group) => group.isRequired && !selections[group.id],
    );

    if (missingRequired) {
      setMessage(copy.required);
      return;
    }

    const response = await fetch("/api/inquiry-items", {
      body: JSON.stringify({
        productId,
        quantity,
        selections: Object.entries(selections).map(
          ([optionGroupId, optionValueId]) => ({
            optionGroupId,
            optionValueId,
          }),
        ),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = (await response.json()) as { error?: string };

    if (response.status === 401) {
      setMessage(copy.signIn);
      return;
    }

    if (!response.ok) {
      setMessage(body.error ?? copy.required);
      return;
    }

    setMessage(copy.success);
  }

  return (
    <div className="space-y-6 rounded-xl border p-5">
      <label className="block space-y-2">
        <span className="text-sm font-medium">{copy.quantity}</span>
        <input
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          min={minimumOrderQuantity ?? 1}
          onChange={(event) => setQuantity(Number(event.target.value))}
          type="number"
          value={quantity}
        />
      </label>
      {optionGroups.map((group) => (
        <fieldset className="space-y-3" key={group.id}>
          <legend className="text-sm font-medium">
            {group.label}
            {group.isRequired ? (
              <span className="text-destructive"> *</span>
            ) : null}
          </legend>
          {group.description ? (
            <p className="text-muted-foreground text-sm">{group.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => (
              <Button
                aria-pressed={selections[group.id] === value.id}
                key={value.id}
                onClick={() =>
                  setSelections((current) => ({
                    ...current,
                    [group.id]: value.id,
                  }))
                }
                type="button"
                variant={
                  selections[group.id] === value.id ? "default" : "outline"
                }
              >
                {value.label}
              </Button>
            ))}
          </div>
        </fieldset>
      ))}
      {message ? <p className="text-destructive text-sm">{message}</p> : null}
      <Button className="w-full sm:w-auto" onClick={addToEnquiry} type="button">
        {copy.add}
      </Button>
    </div>
  );
}
