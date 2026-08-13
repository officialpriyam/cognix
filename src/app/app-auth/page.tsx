import { redirect } from "next/navigation";
import { getSession } from "lib/auth/server";
import { Suspense } from "react";
import AppAuthClient from "./client";

export default async function AppAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const session = await getSession();
  const { state = "" } = await searchParams;

  if (!session?.user?.id) {
    const callbackURL = encodeURIComponent(`/app-auth?state=${state}`);
    redirect(`/sign-in?callbackURL=${callbackURL}`);
  }

  return (
    <Suspense>
      <AppAuthClient />
    </Suspense>
  );
}
