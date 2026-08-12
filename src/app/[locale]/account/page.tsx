import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthForm } from "@/components/account/auth-form";
import { ProfileForm } from "@/components/account/profile-form";
import { SignOutButton } from "@/components/account/sign-out-button";
import { Button } from "@/components/ui/button";
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
  const profile =
    typeof email === "string"
      ? await supabase
          .from("profiles")
          .select("full_name, phone, account_status")
          .maybeSingle()
      : null;

  return (
    <section className="mx-auto max-w-md px-5 py-16 lg:py-24">
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">{title}</h1>
      {typeof email === "string" ? (
        <div className="mt-6 space-y-6">
          <p className="text-muted-foreground leading-7">
            {locale === "zh" ? "当前已登录：" : "Signed in as: "}
            {email}
          </p>
          <p className="text-sm font-medium">
            {locale === "zh"
              ? `账户状态：${profile?.data?.account_status === "active" ? "已审核" : "待审核"}`
              : `Account status: ${profile?.data?.account_status ?? "pending"}`}
          </p>
          <ProfileForm
            fullName={profile?.data?.full_name ?? ""}
            locale={locale}
            phone={profile?.data?.phone ?? ""}
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/${locale}/account/enquiries`}>
                {locale === "zh" ? "查看我的询单" : "View my enquiries"}
              </Link>
            </Button>
            <SignOutButton locale={locale} />
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border p-6">
          <AuthForm locale={locale} />
        </div>
      )}
    </section>
  );
}
