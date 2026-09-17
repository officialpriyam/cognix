"use client";

import { fetcher } from "lib/utils";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Skeleton } from "ui/skeleton";
import { formatMicros } from "./org-shared";

interface OrgUsage {
  period: { from: string; to: string; days: number };
  totals: { finalizedMicros: number; reservedMicros: number };
  members: Array<{
    memberId: string;
    name: string | null;
    email: string;
    role: string;
    finalizedMicros: number;
    reservedMicros: number;
  }>;
}

export function OrgUsageTab({ organizationId }: { organizationId: string }) {
  const { data, error, isLoading } = useSWR<OrgUsage>(
    `/api/organization/${organizationId}/usage`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load usage right now. Please try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recorded usage · last {data.period.days} days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatMicros(data.totals.finalizedMicros)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                micros
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reserved (in-flight)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatMicros(data.totals.reservedMicros)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                micros
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col gap-2">
        {data.members.map((member) => (
          <div
            key={member.memberId}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.name ?? member.email}
              </p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {member.role}
              </p>
            </div>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatMicros(member.finalizedMicros + member.reservedMicros)}{" "}
              micros
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Usage is recorded cost in micros. Cognix itself is free — these numbers
        only feed per-member monthly caps.
      </p>
    </div>
  );
}
