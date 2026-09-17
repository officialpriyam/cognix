"use client";

import { authClient } from "auth/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Badge } from "ui/badge";
import { Skeleton } from "ui/skeleton";

interface DirectoryMember {
  id: string;
  userId: string;
  role: string;
  user: { name: string | null; email: string; image?: string | null };
}

export function OrgMembersTab({ organizationId }: { organizationId: string }) {
  const [members, setMembers] = useState<DirectoryMember[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await authClient.organization.getFullOrganization(
        {
          query: { organizationId },
        },
      );
      if (cancelled) return;
      if (error) {
        toast.error(error.message || "Could not load members");
        setMembers([]);
        return;
      }
      setMembers(
        ((data?.members ?? []) as DirectoryMember[]).slice().sort((a, b) => {
          const rank = (role: string) =>
            role === "owner" ? 0 : role === "admin" ? 1 : 2;
          return rank(a.role) - rank(b.role);
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (members === null) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No members found in this organization.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
        >
          <Avatar className="size-8">
            <AvatarImage src={member.user.image ?? undefined} />
            <AvatarFallback>
              {(member.user.name ?? member.user.email).slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {member.user.name ?? member.user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {member.user.email}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {member.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}
