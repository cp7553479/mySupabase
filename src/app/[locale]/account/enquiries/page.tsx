import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountEnquiriesPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();

  if (typeof data?.claims.sub !== "string") {
    redirect(`/${locale}/account`);
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-16 lg:py-24">
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">
        {locale === "zh" ? "我的询单" : "My enquiries"}
      </h1>
      <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
        {locale === "zh"
          ? "这里将集中展示已提交询单、报价和后续沟通进展。"
          : "Submitted enquiries, quotations and follow-up progress will appear here."}
      </p>
    </section>
  );
}
