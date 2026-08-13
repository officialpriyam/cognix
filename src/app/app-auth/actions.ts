"use server";

import { getSession } from "lib/auth/server";

export async function approveAppAuth(
  state: string,
): Promise<{ error?: string; url?: string }> {
  const session = await getSession();

  if (!session?.session) {
    return { error: "Not authenticated" };
  }

  const url = `cognix://auth?token=${encodeURIComponent(session.session.token)}&state=${encodeURIComponent(state)}`;
  return { url };
}
