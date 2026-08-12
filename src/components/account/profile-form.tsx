"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type ProfileFormProps = { fullName: string; locale: string; phone: string };

export function ProfileForm({
  fullName,
  locale,
  phone,
}: Readonly<ProfileFormProps>) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy =
    locale === "zh"
      ? {
          fullName: "姓名",
          phone: "联系电话",
          save: "保存资料",
          saved: "资料已保存。",
          failed: "暂时无法保存资料。",
        }
      : {
          fullName: "Full name",
          phone: "Phone",
          save: "Save profile",
          saved: "Profile saved.",
          failed: "Profile could not be saved.",
        };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/profile", {
      body: JSON.stringify({
        fullName: form.get("fullName"),
        phone: form.get("phone"),
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    setPending(false);
    setMessage(response.ok ? copy.saved : copy.failed);
  }
  return (
    <form className="space-y-4 rounded-xl border p-5" onSubmit={submit}>
      <label className="block space-y-2 text-sm font-medium">
        {copy.fullName}
        <input
          className="border-input h-9 w-full rounded-md border px-3"
          defaultValue={fullName}
          name="fullName"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        {copy.phone}
        <input
          className="border-input h-9 w-full rounded-md border px-3"
          defaultValue={phone}
          name="phone"
        />
      </label>
      <Button disabled={pending} type="submit">
        {copy.save}
      </Button>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
