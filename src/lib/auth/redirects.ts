import { isLocale } from "@/lib/i18n";

export function getSafeAccountRedirect(
  locale: string,
  value: string | null | undefined,
) {
  const fallback = `/${locale}/account`;

  if (!isLocale(locale) || !value || !value.startsWith(`/${locale}/`)) {
    return fallback;
  }

  return value;
}
