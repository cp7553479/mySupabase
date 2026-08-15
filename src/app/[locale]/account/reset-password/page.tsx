import { notFound, redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/account/reset-password-form";
import { isLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (typeof data?.claims.sub !== "string") {
    redirect(`/${locale}/account`);
  }

  return (
    <section className="mx-auto max-w-md px-5 py-16 lg:py-24">
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">
        {locale === "zh" ? "重设密码" : "Reset password"}
      </h1>
      <div className="mt-8 rounded-xl border p-6">
        <ResetPasswordForm locale={locale} />
      </div>
    </section>
  );
}
