import { notFound } from "next/navigation";

import { AuthForm } from "@/components/account/auth-form";
import { isLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  const title = locale === "zh" ? "账户与询单" : "Account and enquiries";

  return (
    <section className="mx-auto max-w-md px-5 py-16 lg:py-24">
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">{title}</h1>
      {typeof email === "string" ? (
        <p className="text-muted-foreground mt-6 leading-7">
          {locale === "zh" ? "当前已登录：" : "Signed in as: "}
          {email}
        </p>
      ) : (
        <div className="mt-8 rounded-xl border p-6">
          <AuthForm locale={locale} />
        </div>
      )}
    </section>
  );
}
