"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type OrganizationFormProps = {
  industry: string;
  locale: string;
  name: string;
  website: string;
};

export function OrganizationForm({
  industry,
  locale,
  name,
  website,
}: Readonly<OrganizationFormProps>) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy =
    locale === "zh"
      ? {
          create: "创建企业资料",
          failed: "暂时无法保存企业资料。",
          industry: "所属行业",
          name: "企业名称",
          saved: "企业资料已保存。",
          save: "保存企业资料",
          title: "企业资料",
          website: "企业网站",
        }
      : {
          create: "Create company profile",
          failed: "Company profile could not be saved.",
          industry: "Industry",
          name: "Company name",
          saved: "Company profile saved.",
          save: "Save company profile",
          title: "Company profile",
          website: "Company website",
        };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/organization", {
      body: JSON.stringify({
        industry: form.get("industry"),
        name: form.get("name"),
        website: form.get("website"),
      }),
      headers: { "Content-Type": "application/json" },
      method: name ? "PUT" : "POST",
    });
    setPending(false);
    setMessage(response.ok ? copy.saved : copy.failed);
  }

  return (
    <form className="space-y-4 rounded-xl border p-5" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <label className="block space-y-2 text-sm font-medium">
        {copy.name}
        <input
          className="border-input h-9 w-full rounded-md border px-3"
          defaultValue={name}
          name="name"
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium">
          {copy.industry}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={industry}
            name="industry"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          {copy.website}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={website}
            name="website"
            type="url"
          />
        </label>
      </div>
      <Button disabled={pending} type="submit">
        {name ? copy.save : copy.create}
      </Button>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
