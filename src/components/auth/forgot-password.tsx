"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { authClient } from "auth/client";
import { UserZodSchema } from "app-types/user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useObjectState } from "@/hooks/use-object-state";
import { Check, ChevronLeft, KeyRound, Loader, Mail, X } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword({
  emailAndPasswordEnabled = true,
}: {
  emailAndPasswordEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [formData, setFormData] = useObjectState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const passwordValidation = useMemo(() => {
    const password = formData.password;
    return {
      hasMinLength: password.length >= 8 && password.length <= 20,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
      matches: password.length > 0 && password === formData.confirmPassword,
    };
  }, [formData.confirmPassword, formData.password]);

  const requestReset = async () => {
    if (!emailAndPasswordEnabled) {
      toast.error("Email password reset is disabled for this deployment.");
      return;
    }

    const { success } = UserZodSchema.shape.email.safeParse(formData.email);
    if (!success) {
      toast.error("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: formData.email,
        redirectTo: `${window.location.origin}/forgot-password`,
      });

      if (error) {
        toast.error(error.message || "Failed to send reset link");
        return;
      }

      setRequestSent(true);
      toast.success("If that email exists, a reset link has been sent.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Reset request failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!token) {
      toast.error("Reset token is missing");
      return;
    }

    const { success, error } = UserZodSchema.shape.password.safeParse(
      formData.password,
    );
    if (!success) {
      toast.error(error.issues.map((issue) => issue.message).join("\n"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: formData.password,
        token,
      });

      if (error) {
        toast.error(error.message || "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully");
      router.push("/sign-in");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Password reset failed",
      );
    } finally {
      setLoading(false);
    }
  };

  if (token || tokenError) {
    return (
      <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
        <Card className="w-full md:max-w-md bg-card/95 border mx-auto rounded-lg shadow-xl shadow-black/5 animate-in fade-in duration-700">
          <CardHeader className="my-4">
            <CardTitle className="text-2xl text-center my-1">
              Reset password
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Create a new password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {tokenError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                The password reset link is invalid or has expired.
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    autoFocus
                    disabled={loading}
                    value={formData.password}
                    onChange={(e) => setFormData({ password: e.target.value })}
                    type="password"
                    placeholder="********"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    disabled={loading}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ confirmPassword: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        resetPassword();
                      }
                    }}
                    type="password"
                    placeholder="********"
                    required
                  />
                </div>
                {formData.password && (
                  <div className="space-y-1 text-xs">
                    <PasswordCheck
                      checked={passwordValidation.hasMinLength}
                      label="8-20 characters"
                    />
                    <PasswordCheck
                      checked={passwordValidation.hasLetter}
                      label="At least one letter"
                    />
                    <PasswordCheck
                      checked={passwordValidation.hasNumber}
                      label="At least one number"
                    />
                    <PasswordCheck
                      checked={passwordValidation.matches}
                      label="Passwords match"
                    />
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={resetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader className="size-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="size-4" />
                      Reset password
                    </>
                  )}
                </Button>
              </>
            )}
            <BackToSignIn />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
      <Card className="w-full md:max-w-md bg-card/95 border mx-auto rounded-lg shadow-xl shadow-black/5 animate-in fade-in duration-700">
        <CardHeader className="my-4">
          <CardTitle className="text-2xl text-center my-1">
            Forgot password
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your email and we will send a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!emailAndPasswordEnabled ? (
            <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              Password reset is unavailable because email/password sign-in is
              disabled.
            </div>
          ) : requestSent ? (
            <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              If an account exists for that email, a reset link has been sent.
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                autoFocus
                disabled={loading}
                value={formData.email}
                onChange={(e) => setFormData({ email: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    requestReset();
                  }
                }}
                type="email"
                placeholder="user@example.com"
                required
              />
            </div>
          )}
          {emailAndPasswordEnabled && !requestSent && (
            <Button
              className="w-full"
              onClick={requestReset}
              disabled={loading}
            >
              {loading ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <>
                  <Mail className="size-4" />
                  Send reset link
                </>
              )}
            </Button>
          )}
          <BackToSignIn />
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordCheck({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <Check className="size-3 text-primary" />
      ) : (
        <X className="size-3 text-destructive" />
      )}
      <span className={checked ? "text-primary" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

function BackToSignIn() {
  return (
    <Link
      href="/sign-in"
      className="mx-auto inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ChevronLeft className="size-4" />
      Back to sign in
    </Link>
  );
}
