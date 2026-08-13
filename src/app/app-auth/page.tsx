import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { Suspense } from "react";
import AppAuthClient from "./client";

export default async function AppAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state = "" } = await searchParams;
  const hdrs = await headers();
  const sessionToken = getSessionCookie(hdrs);

  if (!sessionToken) {
    const callbackURL = encodeURIComponent(`/app-auth?state=${state}`);
    redirect(`/sign-in?callbackURL=${callbackURL}`);
  }

  return (
    <Suspense>
      <AppAuthClient />
    </Suspense>
  );
}
