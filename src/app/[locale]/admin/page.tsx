import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminOverview } from "@/lib/admin/overview";
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
  const overview = await getAdminOverview(permissionCodes);

  const copy =
    locale === "zh"
      ? {
          content: "已发布内容",
          enquiries: "待处理询单",
          product: "已发布商品",
          restricted: "当前角色无此模块权限",
          title: "业务概览",
        }
      : {
          content: "Published content",
          enquiries: "Submitted enquiries",
          product: "Published products",
          restricted: "This role does not have access to this area.",
          title: "Business overview",
        };

  return (
    <AdminShell locale={locale}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{copy.title}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: copy.product, value: overview.publishedProducts },
            { label: copy.content, value: overview.publishedContent },
            { label: copy.enquiries, value: overview.submittedEnquiries },
          ].map((item) => (
            <section className="rounded-xl border p-5" key={item.label}>
              <p className="text-muted-foreground text-sm">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value ?? "—"}</p>
              {item.value === null ? (
                <p className="text-muted-foreground mt-3 text-xs leading-5">
                  {copy.restricted}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
