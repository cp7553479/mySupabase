import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUserPermissionCodes } from "@/lib/auth/permissions";
import { isLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims.sub !== "string") {
    redirect(`/${locale}/account`);
  }

  const permissionCodes = await getCurrentUserPermissionCodes();
  if (!permissionCodes.has("admin.access")) {
    redirect(`/${locale}/account`);
  }

  return (
    <AdminShell locale={locale}>
      <div className="rounded-xl border p-6">
        <h2 className="text-xl font-semibold">
          {locale === "zh" ? "管理入口已准备就绪" : "Administration is ready"}
        </h2>
        <p className="text-muted-foreground mt-3 leading-7">
          {locale === "zh"
            ? "商品、内容、询单、会员和价格管理页面会在对应功能完成后接入此处。"
            : "Catalogue, content, enquiry, member and pricing management will connect here as each capability is completed."}
        </p>
      </div>
    </AdminShell>
  );
}
