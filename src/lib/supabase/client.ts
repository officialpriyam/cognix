"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./env";

/**
 * Supabase client for the browser (Client Components, hooks, etc.).
 *
 * Must NOT be imported from server-only code paths. Auth state is persisted in
 * cookies so it works with the server client out of the box.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const { url, anonKey } = assertSupabaseConfigured();
  return createBrowserClient(url, anonKey);
}
