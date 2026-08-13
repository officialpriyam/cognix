import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";
import AppAuthClient from "./client";

export default async function AppAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state = "" } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("better-auth.session_token")?.value;

  if (!token) {
    const callbackURL = encodeURIComponent(`/app-auth?state=${state}`);
    redirect(`/sign-in?callbackURL=${callbackURL}`);
  }

  return (
    <Suspense>
      <AppAuthClient />
    </Suspense>
  );
}
