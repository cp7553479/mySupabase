import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseSecretKey } from "@/lib/env/server";
import { getSupabasePublicEnvironment } from "@/lib/env/public";

/** Creates a server-only client for Supabase Auth administration and trusted writes. */
export function createAdminSupabaseClient() {
  const { url } = getSupabasePublicEnvironment();

  return createClient(url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
