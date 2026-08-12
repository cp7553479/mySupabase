"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "@/lib/env/public";

export function createBrowserSupabaseClient() {
  const { publishableKey, url } = getSupabasePublicEnvironment();

  return createBrowserClient(url, publishableKey);
}
