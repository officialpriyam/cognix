import { SidebarProvider } from "ui/sidebar";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "ui/button";

import { getSession } from "lib/auth/server";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { SWRConfigProvider } from "./swr-config";
import { UserDetailContent } from "@/components/user/user-detail/user-detail-content";
import { UserDetailContentSkeleton } from "@/components/user/user-detail/user-detail-content-skeleton";

import { Suspense } from "react";
export const experimental_ppr = true;

export default async function ChatLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    return (
      <SWRConfigProvider>
        <main className="relative bg-background w-full flex flex-col h-screen">
          <header className="border-b border-border/60 px-3 py-2 flex items-center gap-2">
            <Link
              href="/"
              className="font-semibold tracking-tight text-base md:text-lg"
            >
              Cognix
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Create account</Link>
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </SWRConfigProvider>
    );
  }

  const cookieStore = await cookies();

  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <SWRConfigProvider user={session.user}>
        <AppPopupProvider
          userSettingsComponent={
            <Suspense fallback={<UserDetailContentSkeleton />}>
              <UserDetailContent view="user" />
            </Suspense>
          }
        />
        <AppSidebar user={session.user} />
        <main className="relative bg-background  w-full flex flex-col h-screen">
          <AppHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </SWRConfigProvider>
    </SidebarProvider>
  );
}
