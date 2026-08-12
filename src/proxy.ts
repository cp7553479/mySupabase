import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { getSupabasePublicEnvironment } from "@/lib/env/public";
import { isLocale, localePreferenceCookie } from "@/lib/i18n";

export async function proxy(request: NextRequest) {
  const [locale] = request.nextUrl.pathname.split("/").filter(Boolean);
  let response = NextResponse.next({ request });
  const { publishableKey, url } = getSupabasePublicEnvironment();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) =>
          request.cookies.set(cookie.name, cookie.value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach((cookie) =>
          response.cookies.set(cookie.name, cookie.value),
        );
      },
    },
  });

  await supabase.auth.getClaims();

  if (locale && isLocale(locale)) {
    response.cookies.set(localePreferenceCookie, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: "/:locale(en|zh)/:path*",
};
