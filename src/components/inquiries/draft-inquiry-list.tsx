"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { InquiryAttachmentUpload } from "@/components/inquiries/inquiry-attachment-upload";
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
  const [submitting, setSubmitting] = useState(false);
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
          submit: "提交询单",
          submitError: "暂时无法提交询单，请检查信息后重试。",
          submitSuccess: "询单已提交。",
          contactName: "联系人姓名",
          contactEmail: "联系邮箱",
          contactPhone: "联系电话",
          message: "采购说明",
          attachments: "询单附件",
        }
      : {
          empty:
            "Your enquiry list is empty. Browse the catalogue and configure a product to add it here.",
          estimated: "Current estimate",
          itemCount: "items",
          remove: "Remove",
          removeError: "This product could not be removed. Please try again.",
          selectedOptions: "Selected options",
          submit: "Submit enquiry",
          submitError:
            "This enquiry could not be submitted. Check the details and try again.",
          submitSuccess: "Your enquiry has been submitted.",
          contactName: "Contact name",
          contactEmail: "Contact email",
          contactPhone: "Contact phone",
          message: "Procurement notes",
          attachments: "Enquiry attachments",
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

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/inquiries/${inquiry?.id}/submit`, {
      body: JSON.stringify({
        contactEmail: form.get("contactEmail"),
        contactName: form.get("contactName"),
        contactPhone: form.get("contactPhone"),
        message: form.get("message"),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const result = response.ok
      ? ((await response.json()) as { inquiryNumber?: string })
      : null;
    setSubmitting(false);
    setMessage(
      response.ok && result?.inquiryNumber
        ? `${copy.submitSuccess} ${result.inquiryNumber}`
        : response.ok
          ? copy.submitSuccess
          : copy.submitError,
    );

    if (response.ok) {
      router.refresh();
    }
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
      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{copy.attachments}</h2>
        <InquiryAttachmentUpload inquiryId={inquiry.id} locale={locale} />
        {inquiry.attachments.length ? (
          <ul className="text-muted-foreground list-inside list-disc text-sm">
            {inquiry.attachments.map((attachment) => (
              <li key={attachment.id}>{attachment.filename}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <form
        className="space-y-4 rounded-xl border p-5"
        onSubmit={submitInquiry}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            {copy.contactName}
            <input
              className="border-input h-9 w-full rounded-md border px-3"
              name="contactName"
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            {copy.contactEmail}
            <input
              className="border-input h-9 w-full rounded-md border px-3"
              name="contactEmail"
              required
              type="email"
            />
          </label>
        </div>
        <label className="block space-y-2 text-sm font-medium">
          {copy.contactPhone}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            name="contactPhone"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          {copy.message}
          <textarea
            className="border-input min-h-24 w-full rounded-md border p-3"
            name="message"
          />
        </label>
        <Button disabled={submitting} type="submit">
          {copy.submit}
        </Button>
      </form>
      {message ? <p className="text-destructive text-sm">{message}</p> : null}
    </div>
  );
}
