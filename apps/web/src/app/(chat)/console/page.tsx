"use client";

import {
  BarChart3,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Unplug,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Separator } from "ui/separator";
import { Skeleton } from "ui/skeleton";

type ConsoleSnapshot = {
  sessions: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    current: boolean;
  }>;
  accounts: Array<{ id: string; providerId: string; createdAt: string }>;
  connectedApps: Array<{
    clientId: string;
    name: string;
    kind: "desktop" | "oauth";
    lastUsed: string | null;
    scopes: string;
  }>;
  cognixOwnUsage: Array<{ day: string; count: number }>;
  cognixOwnLimit: number;
  cognixOwnConfigured: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function friendlyAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} · ${os}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

const PROVIDER_LABELS: Record<string, string> = {
  credential: "Email & password",
  github: "GitHub",
  google: "Google",
  microsoft: "Microsoft",
  discord: "Discord",
};

function SessionsCard({
  sessions,
  onChanged,
}: {
  sessions: ConsoleSnapshot["sessions"];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const revoke = async (id: string, current: boolean) => {
    if (
      current &&
      !confirm("This signs you out of the current browser. Continue?")
    ) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch("/api/console/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (current) {
        window.location.href = "/";
      } else {
        toast.success("Session signed out");
        onChanged();
      }
    } catch {
      toast.error("Could not sign out that session");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="size-4" /> Signed-in locations
        </CardTitle>
        <CardDescription>
          Every browser currently signed in to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        {sessions.map((session, index) => (
          <div key={session.id}>
            {index > 0 && <Separator />}
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {friendlyAgent(session.userAgent)}
                  {session.current && (
                    <Badge variant="secondary" className="text-[11px]">
                      This device
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5 truncate text-xs">
                  {session.ipAddress ?? "unknown IP"} · active{" "}
                  {relativeTime(session.updatedAt)}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={busyId === session.id}
                onClick={() => revoke(session.id, session.current)}
              >
                {busyId === session.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
                Sign out
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConnectedAppsCard({
  apps,
  onChanged,
}: {
  apps: ConsoleSnapshot["connectedApps"];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const disconnect = async (clientId: string) => {
    setBusyId(clientId);
    try {
      const res = await fetch("/api/console/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("App disconnected");
      onChanged();
    } catch {
      toast.error("Could not disconnect that app");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4" /> Connected apps
        </CardTitle>
        <CardDescription>
          Applications authorized to act on your behalf.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        {apps.length === 0 ? (
          <p className="text-muted-foreground py-3 text-sm">
            No connected apps yet. Sign in from the desktop app to link it here.
          </p>
        ) : (
          apps.map((app, index) => (
            <div key={app.clientId}>
              {index > 0 && <Separator />}
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MonitorSmartphone className="text-muted-foreground size-4 shrink-0" />
                    {app.name}
                    <Badge variant="outline" className="text-[11px] capitalize">
                      {app.kind}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">
                    {app.lastUsed
                      ? `last used ${relativeTime(app.lastUsed)}`
                      : "never used"}{" "}
                    · scopes: {app.scopes || "—"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === app.clientId}
                  onClick={() => disconnect(app.clientId)}
                >
                  {busyId === app.clientId ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Unplug className="size-4" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SigninMethodsCard({
  accounts,
}: {
  accounts: ConsoleSnapshot["accounts"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> Sign-in methods
        </CardTitle>
        <CardDescription>Ways you can sign in to Cognix.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        {accounts.length === 0 ? (
          <p className="text-muted-foreground py-3 text-sm">
            No linked sign-in methods found.
          </p>
        ) : (
          accounts.map((account, index) => (
            <div key={account.id}>
              {index > 0 && <Separator />}
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">
                  {PROVIDER_LABELS[account.providerId] ?? account.providerId}
                </span>
                <span className="text-muted-foreground text-xs">
                  linked {relativeTime(account.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function UsageCard({ snapshot }: { snapshot: ConsoleSnapshot }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayCount =
    snapshot.cognixOwnUsage.find((u) => u.day === today)?.count ?? 0;
  const max = Math.max(
    snapshot.cognixOwnLimit,
    ...snapshot.cognixOwnUsage.map((u) => u.count),
    1,
  );
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (13 - i));
    const day = d.toISOString().slice(0, 10);
    return {
      day,
      count: snapshot.cognixOwnUsage.find((u) => u.day === day)?.count ?? 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4" /> Usage
        </CardTitle>
        <CardDescription>
          CognixOwn self-hosted model requests (Qoder, Relay) per day.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!snapshot.cognixOwnConfigured && (
          <p className="text-muted-foreground text-sm">
            CognixOwn is not enabled on the server yet.
          </p>
        )}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium">Today</span>
            <span className="text-muted-foreground">
              {todayCount} / {snapshot.cognixOwnLimit} requests
            </span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (todayCount / snapshot.cognixOwnLimit) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="flex items-end gap-1.5" aria-hidden="true">
          {last14.map((day) => (
            <div
              key={day.day}
              title={`${day.day}: ${day.count} requests`}
              className="bg-primary/25 flex-1 rounded-sm"
              style={{
                height: `${Math.max(4, (day.count / max) * 48)}px`,
              }}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-xs">Last 14 days (UTC)</p>
      </CardContent>
    </Card>
  );
}

export default function ConsolePage() {
  const { data, error, isLoading, mutate } = useSWR<ConsoleSnapshot>(
    "/api/console",
    fetcher,
    { revalidateOnFocus: true },
  );

  const refresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 p-6">
        <h1 className="text-2xl font-semibold">Console</h1>
        <p className="text-muted-foreground text-sm">
          Could not load your console. Make sure you are signed in and try
          again.
        </p>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="size-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck className="size-6" /> Console
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your account security, connected apps, and usage.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          aria-label="Refresh"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <SessionsCard sessions={data.sessions} onChanged={refresh} />
      <ConnectedAppsCard apps={data.connectedApps} onChanged={refresh} />
      <SigninMethodsCard accounts={data.accounts} />
      <UsageCard snapshot={data} />
    </div>
  );
}
