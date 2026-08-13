import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "lib/auth/server";
import AppAuthClient from "./client";

export default async function AppAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state = "" } = await searchParams;

  const session = await getSession();
  if (!session?.session) {
    const callbackURL = encodeURIComponent(`/app-auth?state=${state}`);
    redirect(`/sign-in?callbackURL=${callbackURL}`);
  }

  return (
    <Suspense>
      <AppAuthClient sessionToken={session.session.token} />
    </Suspense>
  );
}
