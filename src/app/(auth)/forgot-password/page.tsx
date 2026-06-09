import ForgotPassword from "@/components/auth/forgot-password";
import { getAuthConfig } from "auth/config";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function ForgotPasswordPage() {
  const { emailAndPasswordEnabled } = getAuthConfig();

  if (!emailAndPasswordEnabled) {
    redirect("/sign-in");
  }

  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  );
}
