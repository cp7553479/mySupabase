import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthForm } from "@/components/account/auth-form";
import { DeliveryAddressForm } from "@/components/account/delivery-address-form";
import { OrganizationForm } from "@/components/account/organization-form";
import { OrganizationMembers } from "@/components/account/organization-members";
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
  const organization =
    typeof email === "string"
      ? await supabase
          .from("organization_members")
          .select("organization_id, organizations(name, industry, website)")
          .eq("user_id", data?.claims.sub ?? "")
          .eq("status", "active")
          .limit(1)
          .maybeSingle()
      : null;
  const organizationDetails = organization?.data as {
    organizations: {
      industry: string | null;
      name: string;
      website: string | null;
    } | null;
  } | null;
  const deliveryAddress = organizationDetails?.organizations
    ? await supabase
        .from("organization_addresses")
        .select(
          "contact_name, line1, line2, city, state_region, postal_code, country_code, phone",
        )
        .eq("organization_id", organization?.data?.organization_id ?? "")
        .eq("address_type", "shipping")
        .eq("is_default", true)
        .maybeSingle()
    : null;
  const organizationMembers = organizationDetails?.organizations
    ? await supabase
        .from("organization_members")
        .select("user_id, membership_role, status")
        .eq("organization_id", organization?.data?.organization_id ?? "")
        .eq("status", "active")
        .order("membership_role")
    : null;
  const memberIds = (organizationMembers?.data ?? []).map(
    (member) => member.user_id,
  );
  const memberProfiles = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", memberIds)
    : null;
  const memberProfileById = new Map(
    (memberProfiles?.data ?? []).map((profile) => [profile.id, profile]),
  );
  const accountStatus = profile?.data?.account_status ?? "pending";
  const accountStatusCopy =
    locale === "zh"
      ? {
          active: {
            detail: "你的账户已启用，可以继续使用会员服务。",
            label: "已启用",
          },
          pending: {
            detail: "我们正在核对你的账户资料；审核完成后会更新账户状态。",
            label: "待审核",
          },
          suspended: {
            detail: "你的账户当前已暂停。如需协助，请通过联系页面与我们沟通。",
            label: "已暂停",
          },
        }
      : {
          active: {
            detail: "Your account is active and ready to use member services.",
            label: "Active",
          },
          pending: {
            detail:
              "We are reviewing your account details and will update this status when the review is complete.",
            label: "Pending review",
          },
          suspended: {
            detail:
              "Your account is currently suspended. Contact us through the contact page for assistance.",
            label: "Suspended",
          },
        };
  const accountStatusMessage =
    accountStatusCopy[accountStatus as keyof typeof accountStatusCopy] ??
    accountStatusCopy.pending;

  return (
    <section className="mx-auto max-w-md px-5 py-16 lg:py-24">
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">{title}</h1>
      {typeof email === "string" ? (
        <div className="mt-6 space-y-6">
          <p className="text-muted-foreground leading-7">
            {locale === "zh" ? "当前已登录：" : "Signed in as: "}
            {email}
          </p>
          <div className="space-y-1 rounded-lg border p-4">
            <p className="text-sm font-medium">
              {locale === "zh"
                ? `账户状态：${accountStatusMessage.label}`
                : `Account status: ${accountStatusMessage.label}`}
            </p>
            <p className="text-muted-foreground text-sm leading-6">
              {accountStatusMessage.detail}
            </p>
          </div>
          <ProfileForm
            fullName={profile?.data?.full_name ?? ""}
            locale={locale}
            phone={profile?.data?.phone ?? ""}
          />
          <OrganizationForm
            industry={organizationDetails?.organizations?.industry ?? ""}
            locale={locale}
            name={organizationDetails?.organizations?.name ?? ""}
            website={organizationDetails?.organizations?.website ?? ""}
          />
          {organizationDetails?.organizations ? (
            <>
              <DeliveryAddressForm
                address={{
                  city: deliveryAddress?.data?.city ?? "",
                  contactName: deliveryAddress?.data?.contact_name ?? "",
                  countryCode: deliveryAddress?.data?.country_code ?? "",
                  line1: deliveryAddress?.data?.line1 ?? "",
                  line2: deliveryAddress?.data?.line2 ?? "",
                  phone: deliveryAddress?.data?.phone ?? "",
                  postalCode: deliveryAddress?.data?.postal_code ?? "",
                  stateRegion: deliveryAddress?.data?.state_region ?? "",
                }}
                locale={locale}
              />
              <OrganizationMembers
                locale={locale}
                members={(
                  (organizationMembers?.data ?? []) as {
                    membership_role: string;
                    status: string;
                    user_id: string;
                  }[]
                ).map((member) => ({
                  email: memberProfileById.get(member.user_id)?.email ?? null,
                  fullName:
                    memberProfileById.get(member.user_id)?.full_name ?? null,
                  membershipRole: member.membership_role,
                  status: member.status,
                }))}
              />
            </>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/${locale}/account/enquiries`}>
                {locale === "zh" ? "查看我的询单" : "View my enquiries"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/account/favorites`}>
                {locale === "zh" ? "我的收藏" : "Saved products"}
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
