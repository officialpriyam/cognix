"use server";

import { redirect } from "next/navigation";
import { getSession } from "lib/auth/server";
import { cookies } from "next/headers";

export async function approveAppAuth(state: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("better-auth.session_token")?.value;

  if (!token) {
    redirect("/sign-in");
  }

  const redirectUrl = `cognix://auth?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`;
  redirect(redirectUrl);
}
