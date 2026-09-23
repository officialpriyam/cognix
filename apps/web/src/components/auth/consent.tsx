"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: "Verify your identity",
  profile: "Access your basic profile (name, avatar)",
  email: "Access your email address",
  offline_access: "Stay signed in when you're offline",
};

export function ConsentForm({
  consentCode,
  clientId,
  scope,
}: {
  consentCode?: string;
  clientId?: string;
  scope?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const scopes = scope?.split(" ").filter(Boolean) ?? [];
  const appName =
    clientId === "cognix-desktop"
      ? "Cognix Desktop"
      : clientId || "Unknown app";

  const decide = async (accept: boolean) => {
    if (!consentCode && !accept) {
      router.push("/");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accept,
          ...(consentCode ? { consent_code: consentCode } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error_description || err.message || "Failed");
      }
      const data = await res.json();
      if (data.redirectURI) {
        window.location.href = data.redirectURI;
      } else {
        router.push("/");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process consent");
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="w-sm">
        <CardHeader>
          <CardTitle>Authorize {appName}</CardTitle>
          <CardDescription>
            <strong>{appName}</strong> wants to access your Cognix account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {scopes.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-primary shrink-0" />
                <span>{SCOPE_DESCRIPTIONS[s] ?? s}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={loading}
              onClick={() => decide(false)}
            >
              Deny
            </Button>
            <Button
              className="flex-1"
              disabled={loading}
              onClick={() => decide(true)}
            >
              {loading ? "Authorizing…" : "Allow"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
