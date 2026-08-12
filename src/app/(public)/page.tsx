import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale, localePreferenceCookie } from "@/lib/i18n";

export default async function HomePage() {
  const preference = (await cookies()).get(localePreferenceCookie)?.value;
  const locale =
    preference && isLocale(preference) ? preference : defaultLocale;

  redirect(`/${locale}`);
}
