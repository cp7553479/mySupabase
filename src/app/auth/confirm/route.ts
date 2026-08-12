import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "@/lib/env/public";
import { defaultLocale, isLocale } from "@/lib/i18n";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale =
    requestedLocale && isLocale(requestedLocale)
      ? requestedLocale
      : defaultLocale;
  const redirectUrl = new URL(`/${locale}/account`, request.url);
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
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }

  return response;
}
