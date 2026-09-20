"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useObjectState } from "@/hooks/use-object-state";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { analytics } from "@/lib/analytics/posthog";
import { callbackUrlQuery } from "@/lib/auth/callback-url";
import { SocialAuthenticationProvider } from "app-types/authentication";
import { authClient } from "auth/client";
import { Eye, EyeOff, Loader, Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { DiscordIcon } from "ui/discord-icon";
import { GithubIcon } from "ui/github-icon";
import { GoogleIcon } from "ui/google-icon";
import { MicrosoftIcon } from "ui/microsoft-icon";

export default function SignIn({
  emailAndPasswordEnabled,
  signUpEnabled,
  socialAuthenticationProviders,
  isFirstUser,
  callbackUrl,
}: {
  emailAndPasswordEnabled: boolean;
  signUpEnabled: boolean;
  socialAuthenticationProviders: SocialAuthenticationProvider[];
  isFirstUser: boolean;
  callbackUrl?: string;
}) {
  const t = useTranslations("Auth.SignIn");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const redirectTo = callbackUrl || "/";

  const [formData, setFormData] = useObjectState({
    email: "",
    password: "",
    rememberMe: true,
  });

  const emailAndPasswordSignIn = () => {
    setLoading(true);
    safe(() =>
      authClient.signIn.email(
        {
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
          callbackURL: redirectTo,
        },
        {
          onSuccess(ctx) {
            // Track successful sign-in
            if (ctx.data?.user?.id) {
              analytics.identify(ctx.data.user.id, {
                email: ctx.data.user.email,
                name: ctx.data.user.name,
              });
              analytics.userSignedIn({
                method: "email",
                userId: ctx.data.user.id,
                email: ctx.data.user.email,
              });
            }
          },
          onError(ctx) {
            toast.error(ctx.error.message || ctx.error.statusText);
          },
        },
      ),
    )
      .watch(() => setLoading(false))
      .unwrap();
  };

  const handleSocialSignIn = (provider: SocialAuthenticationProvider) => {
    authClient.signIn
      .social(
        { provider, callbackURL: redirectTo },
        {
          onSuccess(ctx) {
            // Track successful social sign-in
            if (ctx.data?.user?.id) {
              analytics.identify(ctx.data.user.id, {
                email: ctx.data.user.email,
                name: ctx.data.user.name,
              });
              analytics.userSignedIn({
                method: provider,
                userId: ctx.data.user.id,
                email: ctx.data.user.email,
              });
            }
          },
        },
      )
      .catch((e) => {
        toast.error(e.error);
      });
  };

  const showEmailForm = emailAndPasswordEnabled && !isFirstUser;
  const showSocial = socialAuthenticationProviders.length > 0;

  return (
    <div className="min-h-full w-full flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,197,223,0.10),transparent_55%),radial-gradient(100%_80%_at_85%_100%,rgba(168,85,247,0.10),transparent_60%)] dark:bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,197,223,0.12),transparent_55%),radial-gradient(100%_80%_at_85%_100%,rgba(168,85,247,0.14),transparent_60%),#09090b]">
      <div className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden rounded-3xl border border-black/5 bg-white/90 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)] backdrop-blur animate-in fade-in zoom-in-95 duration-500 dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]">
        {/* Brand panel */}
        <div className="relative hidden md:flex flex-col justify-between overflow-hidden p-8 text-white bg-[linear-gradient(140deg,#0e7490,#155e75_35%,#1e1b4b_70%,#3b0764)] dark:bg-[linear-gradient(140deg,#083344,#0e3a4a_35%,#171233_70%,#2a0a4a)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-cyan-300/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -right-16 size-80 rounded-full bg-fuchsia-400/30 blur-3xl"
          />
          <div className="relative text-[44px] font-bold leading-none tracking-tight">
            COGNIX
            <div className="mt-1 text-[13px] font-medium tracking-[0.3em] text-cyan-100/80">
              BEYOND CODING
            </div>
          </div>
          <div aria-hidden className="relative mx-auto my-6">
            <div className="size-36 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.95),rgba(255,255,255,0.25)_35%,rgba(0,197,223,0.55)_60%,rgba(168,85,247,0.65)_85%)] shadow-[0_0_60px_10px_rgba(0,197,223,0.35)] backdrop-blur-xl border border-white/40" />
            <div className="absolute inset-x-6 -bottom-3 h-6 rounded-[100%] bg-cyan-200/50 blur-xl" />
          </div>
          <div className="relative">
            <div className="text-xl font-semibold">
              Intelligent AI Assistance
            </div>
            <p className="mt-2 text-[13px] leading-5 text-white/70">
              Experience smarter conversations with AI-powered responses,
              personalized insights and seamless productivity across every
              interaction.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-6 sm:p-10 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Cognix"
                width={24}
                height={24}
                className="size-6 object-contain"
              />
            </span>
          </div>
          <h1 className="mt-5 text-[26px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {t("description")}
          </p>

          {showEmailForm && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="email"
                    autoFocus
                    disabled={loading}
                    value={formData.email}
                    onChange={(e) => setFormData({ email: e.target.value })}
                    type="email"
                    placeholder="user@example.com"
                    required
                    className="pl-9 rounded-xl bg-zinc-100/70 border-transparent focus-visible:ring-cyan-500 dark:bg-zinc-900 dark:border-white/10"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="password"
                    disabled={loading}
                    value={formData.password}
                    placeholder="********"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        emailAndPasswordSignIn();
                      }
                    }}
                    onChange={(e) => setFormData({ password: e.target.value })}
                    type={showPassword ? "text" : "password"}
                    required
                    className="pl-9 pr-10 rounded-xl bg-zinc-100/70 border-transparent focus-visible:ring-cyan-500 dark:bg-zinc-900 dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center text-[13px]">
                <label className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) =>
                      setFormData({ rememberMe: e.target.checked })
                    }
                    className="size-3.5 rounded accent-cyan-600"
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  className="ml-auto text-zinc-500 hover:text-zinc-800 hover:underline underline-offset-4 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Button
                className="w-full h-11 rounded-full icon-motion-pop bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-500/90 hover:to-pink-500/90 text-white dark:from-cyan-500 dark:to-sky-600 dark:hover:from-cyan-500/90 dark:hover:to-sky-600/90"
                onClick={emailAndPasswordSignIn}
                disabled={loading}
                data-testid="signin-submit-button"
              >
                {loading ? (
                  <Loader className="size-4 animate-spin ml-1" />
                ) : (
                  t("signIn")
                )}
              </Button>
            </div>
          )}

          {showSocial && (
            <>
              {showEmailForm && (
                <div className="flex items-center my-5">
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                  <span className="px-4 text-xs text-zinc-400 dark:text-zinc-500">
                    {t("orContinueWith")}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                </div>
              )}
              <div
                className={`grid gap-2 w-full ${showEmailForm ? "" : "mt-6"}`}
              >
                {socialAuthenticationProviders.includes("google") && (
                  <Button
                    variant="outline"
                    onClick={() => handleSocialSignIn("google")}
                    className="flex-1 w-full h-11 rounded-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 icon-motion-slide"
                  >
                    <GoogleIcon className="size-4 fill-foreground" />
                    Google
                  </Button>
                )}
                {socialAuthenticationProviders.includes("discord") && (
                  <Button
                    variant="outline"
                    onClick={() => handleSocialSignIn("discord")}
                    className="flex-1 w-full h-11 rounded-full icon-motion-slide"
                  >
                    <DiscordIcon className="size-4" />
                    Discord
                  </Button>
                )}
                {socialAuthenticationProviders.includes("github") && (
                  <Button
                    variant="outline"
                    onClick={() => handleSocialSignIn("github")}
                    className="flex-1 w-full h-11 rounded-full icon-motion-slide"
                  >
                    <GithubIcon className="size-4 fill-foreground" />
                    GitHub
                  </Button>
                )}
                {socialAuthenticationProviders.includes("microsoft") && (
                  <Button
                    variant="outline"
                    onClick={() => handleSocialSignIn("microsoft")}
                    className="flex-1 w-full h-11 rounded-full icon-motion-slide"
                  >
                    <MicrosoftIcon className="size-4 fill-foreground" />
                    Microsoft
                  </Button>
                )}
              </div>
            </>
          )}

          {signUpEnabled && (
            <div className="mt-6 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
              {t("noAccount")}
              <Link
                href={`/sign-up${callbackUrlQuery(callbackUrl)}`}
                className="font-medium underline-offset-4 text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {t("signUp")}
              </Link>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-zinc-100/70 px-4 py-3 dark:bg-zinc-900">
            <div className="flex -space-x-2">
              {["C", "Q", "A"].map((initial) => (
                <span
                  key={initial}
                  className="flex size-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white dark:border-zinc-950 bg-gradient-to-br from-cyan-500 to-sky-700"
                >
                  {initial}
                </span>
              ))}
            </div>
            <div className="text-[12px] leading-4">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                Built for builders
              </div>
              <div className="text-zinc-500 dark:text-zinc-400">
                Code, chat and ship with Cognix
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
