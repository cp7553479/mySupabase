import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminOverview = {
  publishedContent: number | null;
  publishedProducts: number | null;
  submittedEnquiries: number | null;
};

async function countRows(
  table: "content_entries" | "inquiries" | "products",
  filters: ReadonlyArray<readonly [string, string]>,
) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  for (const [column, value] of filters) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Could not read administration overview: ${error.message}`);
  }

  return count ?? 0;
}

export async function getAdminOverview(
  permissionCodes: ReadonlySet<string>,
): Promise<AdminOverview> {
  const canManageCatalogue = permissionCodes.has("catalog.manage");
  const canManageContent = permissionCodes.has("content.manage");
  const canManageEnquiries = permissionCodes.has("inquiries.manage");
  const [publishedProducts, publishedContent, submittedEnquiries] =
    await Promise.all([
      canManageCatalogue
        ? countRows("products", [["status", "published"]])
        : Promise.resolve(null),
      canManageContent
        ? countRows("content_entries", [["status", "published"]])
        : Promise.resolve(null),
      canManageEnquiries
        ? countRows("inquiries", [["status", "submitted"]])
        : Promise.resolve(null),
    ]);

  return { publishedContent, publishedProducts, submittedEnquiries };
}
