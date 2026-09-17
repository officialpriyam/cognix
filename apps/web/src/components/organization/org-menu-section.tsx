"use client";

import { authClient } from "auth/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "ui/dropdown-menu";
import { DropdownMenuItem } from "ui/dropdown-menu";
import { Building2, Check, Plus } from "lucide-react";
import { CreateOrganizationDialog } from "./create-organization-dialog";

interface OrgListEntry {
  id: string;
  name: string;
  slug?: string | null;
}

export function OrgMenuSection() {
  const router = useRouter();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [orgs, setOrgs] = useState<OrgListEntry[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await authClient.organization.list();
      if (cancelled) return;
      if (error) return;
      setOrgs(((data ?? []) as OrgListEntry[]).slice());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchOrg = async (organizationId: string) => {
    if (organizationId === activeOrg?.id) return;
    const { error } = await authClient.organization.setActive({
      organizationId,
    });
    if (error) {
      toast.error(error.message || "Could not switch workspace");
      return;
    }
    router.refresh();
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          data-testid="workspace-submenu-trigger"
          className="cursor-pointer"
        >
          <Building2 className="mr-2 size-4" />
          <span className="truncate">
            {activeOrg?.name ? `${activeOrg.name}` : "Workspace"}
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-60">
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="cursor-pointer"
                onClick={() => void switchOrg(org.id)}
              >
                <span className="truncate">{org.name}</span>
                {org.id === activeOrg?.id && (
                  <Check className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
            {orgs.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={!activeOrg}
              onClick={() =>
                activeOrg && router.push(`/organization/${activeOrg.id}`)
              }
            >
              <span>Manage</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1 size-4" />
              <span>Create Organization</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      <CreateOrganizationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(organizationId) => {
          router.push(`/organization/${organizationId}`);
          router.refresh();
        }}
      />
    </>
  );
}
