"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function ResetPasswordForm({ locale }: Readonly<{ locale: string }>) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const copy =
    locale === "zh"
      ? {
          confirm: "确认新密码",
          mismatch: "两次输入的密码不一致。",
          password: "新密码",
          saved: "密码已更新。",
          submit: "更新密码",
        }
      : {
          confirm: "Confirm new password",
          mismatch: "The two passwords do not match.",
          password: "New password",
          saved: "Your password has been updated.",
          submit: "Update password",
        };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (password !== confirmation) {
      setMessage(copy.mismatch);
      return;
    }

    setPending(true);
    const { error } = await createBrowserSupabaseClient().auth.updateUser({
      password,
    });
    setPending(false);
    setMessage(error?.message ?? copy.saved);
    if (!error) router.replace(`/${locale}/account`);
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{copy.password}</span>
        <input
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{copy.confirm}</span>
        <input
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          minLength={8}
          name="confirmation"
          required
          type="password"
        />
      </label>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {copy.submit}
      </Button>
    </form>
  );
}
