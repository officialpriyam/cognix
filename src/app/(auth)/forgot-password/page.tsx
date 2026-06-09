import ForgotPassword from "@/components/auth/forgot-password";
import { getAuthConfig } from "auth/config";
import { Suspense } from "react";

export default function ForgotPasswordPage() {
  const { emailAndPasswordEnabled } = getAuthConfig();

  return (
    <Suspense>
      <ForgotPassword emailAndPasswordEnabled={emailAndPasswordEnabled} />
    </Suspense>
  );
}
