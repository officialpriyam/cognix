"use server";

import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";

export async function approveAppAuth(
  state: string,
): Promise<{ error?: string; url?: string }> {
  const hdrs = await headers();
  const sessionToken = getSessionCookie(hdrs);

  if (!sessionToken) {
    return { error: "Not authenticated" };
  }

  const url = `cognix://auth?token=${encodeURIComponent(sessionToken)}&state=${encodeURIComponent(state)}`;
  return { url };
}
