import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnvironment } from "@/lib/env/public";

export function createPublicSupabaseClient() {
  const { publishableKey, url } = getSupabasePublicEnvironment();

  return createClient(url, publishableKey);
}
