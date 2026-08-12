"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type SignOutButtonProps = { locale: string };

export function SignOutButton({ locale }: Readonly<SignOutButtonProps>) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const label = locale === "zh" ? "退出登录" : "Sign out";

  async function signOut() {
    setPending(true);
    await createBrowserSupabaseClient().auth.signOut();
    router.push(`/${locale}/account`);
    router.refresh();
  }

  return (
    <Button
      disabled={pending}
      onClick={signOut}
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  );
}
