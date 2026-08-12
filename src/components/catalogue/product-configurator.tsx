"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  CatalogueOptionGroup,
  CatalogueService,
} from "@/lib/catalogue/queries";

type ProductConfiguratorProps = {
  locale: string;
  minimumOrderQuantity: number | null;
  optionGroups: CatalogueOptionGroup[];
  productId: string;
  services: CatalogueService[];
};

export function ProductConfigurator({
  locale,
  minimumOrderQuantity,
  optionGroups,
  productId,
  services,
}: Readonly<ProductConfiguratorProps>) {
  const [quantity, setQuantity] = useState(minimumOrderQuantity ?? 1);
  const [customerNote, setCustomerNote] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [enteredValues, setEnteredValues] = useState<Record<string, string>>(
    {},
  );
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const copy =
    locale === "zh"
      ? {
          add: "加入询单列表",
          note: "定制说明",
          quantity: "采购数量",
          requiredDate: "期望交期",
          required: "请完成必填配置后加入询单列表。",
          minimum: "数量未达到起订量。",
          maximum: "该配置已达到可选数量上限。",
          services: "附加服务",
          signIn: "请先登录，再将商品加入询单列表。",
          success: "商品已加入草稿询单。",
        }
      : {
          add: "Add to enquiry list",
          note: "Customisation notes",
          quantity: "Quantity",
          requiredDate: "Requested delivery date",
          required:
            "Complete the required configuration before adding this item.",
          minimum: "The quantity is below the minimum order quantity.",
          maximum: "This configuration has reached its selection limit.",
          services: "Additional services",
          signIn: "Sign in before adding this product to your enquiry list.",
          success: "Product added to your draft enquiry.",
        };

  async function addToEnquiry() {
    if (minimumOrderQuantity && quantity < minimumOrderQuantity) {
      setMessage(copy.minimum);
      return;
    }

    const missingRequired = optionGroups.some((group) => {
      if (group.inputType === "text" || group.inputType === "number") {
        return group.isRequired && !enteredValues[group.id]?.trim();
      }

      const minimumSelections = Math.max(
        group.minimumSelections,
        group.isRequired ? 1 : 0,
      );
      return (selections[group.id]?.length ?? 0) < minimumSelections;
    });

    if (missingRequired) {
      setMessage(copy.required);
      return;
    }

    const response = await fetch("/api/inquiry-items", {
      body: JSON.stringify({
        productId,
        quantity,
        customerNote,
        requiredDate: requiredDate || null,
        serviceCodes,
        selections: Object.entries(selections).flatMap(
          ([optionGroupId, optionValueIds]) =>
            optionValueIds.map((optionValueId) => ({
              optionGroupId,
              optionValueId,
            })),
        ),
        enteredValues: Object.entries(enteredValues)
          .filter(([, value]) => value.trim())
          .map(([optionGroupId, enteredValue]) => ({
            enteredValue: enteredValue.trim(),
            optionGroupId,
          })),
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

  function toggleSelection(
    groupId: string,
    optionValueId: string,
    inputType: CatalogueOptionGroup["inputType"],
    maximumSelections: number | null,
  ) {
    setSelections((current) => {
      const selected = current[groupId] ?? [];
      if (inputType === "single_select") {
        return { ...current, [groupId]: [optionValueId] };
      }

      if (selected.includes(optionValueId)) {
        return {
          ...current,
          [groupId]: selected.filter((value) => value !== optionValueId),
        };
      }

      if (maximumSelections !== null && selected.length >= maximumSelections) {
        setMessage(copy.maximum);
        return current;
      }

      return { ...current, [groupId]: [...selected, optionValueId] };
    });
  }

  function toggleService(serviceCode: string) {
    setServiceCodes((current) =>
      current.includes(serviceCode)
        ? current.filter((code) => code !== serviceCode)
        : [...current, serviceCode],
    );
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
      <label className="block space-y-2">
        <span className="text-sm font-medium">{copy.requiredDate}</span>
        <input
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          onChange={(event) => setRequiredDate(event.target.value)}
          type="date"
          value={requiredDate}
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
          {group.inputType === "text" || group.inputType === "number" ? (
            <input
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              inputMode={group.inputType === "number" ? "decimal" : undefined}
              onChange={(event) =>
                setEnteredValues((current) => ({
                  ...current,
                  [group.id]: event.target.value,
                }))
              }
              type={group.inputType === "number" ? "number" : "text"}
              value={enteredValues[group.id] ?? ""}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => (
                <Button
                  aria-pressed={
                    selections[group.id]?.includes(value.id) ?? false
                  }
                  key={value.id}
                  onClick={() =>
                    toggleSelection(
                      group.id,
                      value.id,
                      group.inputType,
                      group.maximumSelections,
                    )
                  }
                  type="button"
                  variant={
                    selections[group.id]?.includes(value.id)
                      ? "default"
                      : "outline"
                  }
                >
                  {value.label}
                </Button>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      {services.length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{copy.services}</legend>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <Button
                aria-pressed={serviceCodes.includes(service.code)}
                key={service.code}
                onClick={() => toggleService(service.code)}
                type="button"
                variant={
                  serviceCodes.includes(service.code) ? "default" : "outline"
                }
              >
                {service.name}
                {service.leadTimeDays !== null
                  ? ` (${service.leadTimeDays} ${locale === "zh" ? "天" : "days"})`
                  : ""}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="block space-y-2">
        <span className="text-sm font-medium">{copy.note}</span>
        <textarea
          className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
          onChange={(event) => setCustomerNote(event.target.value)}
          value={customerNote}
        />
      </label>
      {message ? <p className="text-destructive text-sm">{message}</p> : null}
      <Button className="w-full sm:w-auto" onClick={addToEnquiry} type="button">
        {copy.add}
      </Button>
    </div>
  );
}
