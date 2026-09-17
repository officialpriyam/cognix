"use client";

import type { BasicUserWithLastLogin } from "app-types/user";
import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import { useEffect, useRef } from "react";
import useSWR from "swr";
import { UserDetail } from "./user-detail";
import { UserDetailContentSkeleton } from "./user-detail-content-skeleton";
import { UserStatisticsCard } from "./user-statistics-card";

type SettingsContext = {
  currentUserId: string;
  user: BasicUserWithLastLogin;
  userAccountInfo: { hasPassword: boolean; oauthProviders: string[] };
  stats: {
    threadCount: number;
    messageCount: number;
    modelStats: Array<{
      model: string;
      messageCount: number;
      totalTokens: number;
      provider: string;
    }>;
    totalTokens: number;
    period: string;
  };
};

/**
 * Client-side self-view settings content. Fetches user, accounts and stats in a
 * single request the first time it mounts (which only happens when the settings
 * drawer opens), replacing the layout's eager per-page-load server render.
 */
export function UserSettingsContent({
  view = "user",
}: {
  view?: "admin" | "user";
}) {
  const { data } = useSWR<SettingsContext>(
    "/api/user/settings-context",
    fetcher,
  );
  const section = appStore((state) => state.userSettingsSection);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (section === "usage" && data?.user) {
      statsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [section, data?.user]);

  if (!data?.user) {
    return <UserDetailContentSkeleton />;
  }

  return (
    <UserDetail
      view={view}
      user={data.user}
      currentUserId={data.currentUserId}
      userAccountInfo={data.userAccountInfo}
      userStatsSlot={
        <div ref={statsRef} className="scroll-mt-4">
          <UserStatisticsCard
            stats={{ ...data.stats, period: "Last 30 Days" }}
            view={view}
          />
        </div>
      }
    />
  );
}
