import "server-only";

import { getCurrentUserPermissionCodes } from "@/lib/auth/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Resolves the caller and enforces a database-managed administration permission. */
export async function requireAdminPermission(permission: string) {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (typeof userId !== "string") {
    return { error: "Authentication required.", status: 401 as const };
  }

  const permissions = await getCurrentUserPermissionCodes();
  if (!permissions.has(permission)) {
    return {
      error: "You do not have permission for this action.",
      status: 403 as const,
    };
  }

  return { supabase, userId };
}
