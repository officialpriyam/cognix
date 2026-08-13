"use server";

export async function approveAppAuth(
  state: string,
  sessionToken: string,
): Promise<{ error?: string; url?: string }> {
  if (!sessionToken) {
    return { error: "Not authenticated" };
  }

  const url = `cognix://auth?token=${encodeURIComponent(sessionToken)}&state=${encodeURIComponent(state)}`;
  return { url };
}
