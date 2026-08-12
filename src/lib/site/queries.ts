import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/client";

export type SiteNavigationItem = {
  label: string;
  openInNewTab: boolean;
  targetPath: string;
  targetType: "external_url" | "path";
};

export type PublicSiteData = {
  contactEmail: string | null;
  footerCatalogue: SiteNavigationItem[];
  footerCompany: SiteNavigationItem[];
  primaryNavigation: SiteNavigationItem[];
  siteName: string;
};

type NavigationItemRow = {
  id: string;
  menu_id: string;
  open_in_new_tab: boolean;
  sort_order: number;
  target_path: string;
  target_type: "external_url" | "path";
};

type NavigationMenuRow = {
  code: "footer_catalogue" | "footer_company" | "primary";
  id: string;
};

type NavigationTranslationRow = {
  label: string;
  locale: string;
  navigation_item_id: string;
};

function requireData<T>(data: T | null, message: string): T {
  if (!data) {
    throw new Error(message);
  }

  return data;
}

export const getPublicSiteData = cache(async (locale: string) => {
  const supabase = createPublicSupabaseClient();
  const [settingsResult, menusResult] = await Promise.all([
    supabase
      .from("site_settings")
      .select("site_name, contact_email")
      .eq("id", true)
      .single(),
    supabase
      .from("navigation_menus")
      .select("id, code")
      .eq("status", "published")
      .order("code"),
  ]);

  if (settingsResult.error) {
    throw new Error(
      `Could not read site settings: ${settingsResult.error.message}`,
    );
  }

  if (menusResult.error) {
    throw new Error(
      `Could not read navigation menus: ${menusResult.error.message}`,
    );
  }

  const settings = requireData(
    settingsResult.data,
    "Site settings are missing.",
  );
  const menus = menusResult.data as NavigationMenuRow[];
  const menuIds = menus.map((menu) => menu.id);

  const [itemsResult, translationsResult] = await Promise.all([
    supabase
      .from("navigation_items")
      .select(
        "id, menu_id, target_type, target_path, open_in_new_tab, sort_order",
      )
      .in("menu_id", menuIds)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("navigation_item_translations")
      .select("navigation_item_id, locale, label")
      .eq("locale", locale),
  ]);

  if (itemsResult.error) {
    throw new Error(
      `Could not read navigation items: ${itemsResult.error.message}`,
    );
  }

  if (translationsResult.error) {
    throw new Error(
      `Could not read navigation translations: ${translationsResult.error.message}`,
    );
  }

  const translations = new Map(
    (translationsResult.data as NavigationTranslationRow[]).map(
      (translation) => [translation.navigation_item_id, translation.label],
    ),
  );
  const navigationByCode = new Map<string, SiteNavigationItem[]>();
  const menuCodeById = new Map(menus.map((menu) => [menu.id, menu.code]));

  for (const item of itemsResult.data as NavigationItemRow[]) {
    const menuCode = menuCodeById.get(item.menu_id);
    const label = translations.get(item.id);

    if (!menuCode || !label || !item.target_path) {
      continue;
    }

    const entries = navigationByCode.get(menuCode) ?? [];
    entries.push({
      label,
      openInNewTab: item.open_in_new_tab,
      targetPath: item.target_path,
      targetType: item.target_type,
    });
    navigationByCode.set(menuCode, entries);
  }

  return {
    contactEmail: settings.contact_email,
    footerCatalogue: navigationByCode.get("footer_catalogue") ?? [],
    footerCompany: navigationByCode.get("footer_company") ?? [],
    primaryNavigation: navigationByCode.get("primary") ?? [],
    siteName: settings.site_name,
  } satisfies PublicSiteData;
});
