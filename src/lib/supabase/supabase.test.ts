import { describe, expect, it } from "vitest";
import { getSupabaseEnv } from "./env";

describe("getSupabaseEnv", () => {
  it("reports not configured when env is empty", () => {
    const env = getSupabaseEnv({});
    expect(env.isConfigured).toBe(false);
    expect(env.url).toBe("");
    expect(env.anonKey).toBe("");
    expect(env.serviceRoleKey).toBeUndefined();
  });

  it("is configured with the public URL + anon key", () => {
    const env = getSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    });
    expect(env.isConfigured).toBe(true);
    expect(env.url).toBe("https://x.supabase.co");
    expect(env.anonKey).toBe("anon");
    expect(env.serviceRoleKey).toBeUndefined();
  });

  it("captures the service role key without exposing it in isConfigured", () => {
    const env = getSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
    });
    expect(env.isConfigured).toBe(true);
    expect(env.serviceRoleKey).toBe("secret");
  });

  it("trims surrounding whitespace", () => {
    const env = getSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "  https://x.supabase.co  ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon ",
    });
    expect(env.url).toBe("https://x.supabase.co");
    expect(env.anonKey).toBe("anon");
  });
});
