import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "@/lib/env/public";
import { getSafeAccountRedirect } from "@/lib/auth/redirects";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale =
    requestedLocale && isLocale(requestedLocale)
      ? requestedLocale
      : defaultLocale;
  const redirectUrl = new URL(
    getSafeAccountRedirect(locale, request.nextUrl.searchParams.get("next")),
    request.url,
  );
  const response = NextResponse.redirect(redirectUrl);

  if (!tokenHash) {
    return response;
  }

  const { publishableKey, url } = getSupabasePublicEnvironment();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) =>
          response.cookies.set(cookie.name, cookie.value),
        );
      },
    },
  });
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && type === "invite" && data.user) {
      const { error: membershipError } = await createAdminSupabaseClient()
        .from("organization_members")
        .update({ joined_at: new Date().toISOString(), status: "active" })
        .eq("user_id", data.user.id)
        .eq("status", "invited");
      if (membershipError) {
        throw new Error(
          `Could not activate the invited company membership: ${membershipError.message}`,
        );
      }
    }
  }

  return response;
}
