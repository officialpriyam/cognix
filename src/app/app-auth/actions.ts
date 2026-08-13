"use server";

import { cookies } from "next/headers";

export async function approveAppAuth(
  state: string,
): Promise<{ error?: string; url?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("better-auth.session_token")?.value;

  if (!token) {
    return { error: "Not authenticated" };
  }

  const url = `cognix://auth?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`;
  return { url };
}
