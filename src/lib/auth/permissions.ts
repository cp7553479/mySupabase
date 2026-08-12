import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Reads the signed-in user's database-managed permission codes for server-side route guards. */
export async function getCurrentUserPermissionCodes(): Promise<Set<string>> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (typeof userId !== "string") {
    return new Set();
  }

  const { data: roleAssignments, error: roleAssignmentsError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  if (roleAssignmentsError) {
    throw new Error(
      `Could not read current user roles: ${roleAssignmentsError.message}`,
    );
  }

  const roleIds = roleAssignments.map((assignment) => assignment.role_id);
  if (roleIds.length === 0) {
    return new Set();
  }

  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds);

  if (rolePermissionsError) {
    throw new Error(
      `Could not read role permissions: ${rolePermissionsError.message}`,
    );
  }

  const permissionIds = rolePermissions.map(
    (assignment) => assignment.permission_id,
  );
  if (permissionIds.length === 0) {
    return new Set();
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("code")
    .in("id", permissionIds);

  if (permissionsError) {
    throw new Error(`Could not read permissions: ${permissionsError.message}`);
  }

  return new Set(permissions.map((permission) => permission.code));
}
