import { NextRequest, NextResponse } from "next/server";

import { isLocale, localePreferenceCookie } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const [locale] = request.nextUrl.pathname.split("/").filter(Boolean);
  const response = NextResponse.next();

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
