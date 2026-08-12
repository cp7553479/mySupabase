"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CatalogueOptionGroup } from "@/lib/catalogue/queries";

type ProductConfiguratorProps = {
  locale: string;
  minimumOrderQuantity: number | null;
  optionGroups: CatalogueOptionGroup[];
};

export function ProductConfigurator({
  locale,
  minimumOrderQuantity,
  optionGroups,
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
        }
      : {
          add: "Add to enquiry list",
          quantity: "Quantity",
          required:
            "Complete the required configuration before adding this item.",
          minimum: "The quantity is below the minimum order quantity.",
        };

  function validate() {
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

    setMessage(null);
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
      <Button className="w-full sm:w-auto" onClick={validate} type="button">
        {copy.add}
      </Button>
    </div>
  );
}
