"use client";

import { authClient } from "auth/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";

export function OrgSettingsTab({
  organizationId,
  initialName,
  slug,
  isManager,
  onRenamed,
}: {
  organizationId: string;
  initialName: string;
  slug: string | null;
  isManager: boolean;
  onRenamed: (name: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Organization name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const { error } = await authClient.organization.update({
        organizationId,
        data: { name: trimmed },
      });
      if (error) throw new Error(error.message || "Rename failed");
      onRenamed(trimmed);
      toast.success("Organization renamed");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not rename organization",
      );
    } finally {
      setSaving(false);
    }
  };

  const leave = async () => {
    if (
      !window.confirm(
        "Leave this organization? You will lose access to its chats, agents, and workflows.",
      )
    ) {
      return;
    }
    setLeaving(true);
    try {
      const { error } = await authClient.organization.leave({ organizationId });
      if (error) throw new Error(error.message || "Could not leave");
      toast.success("You left the organization");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not leave organization",
      );
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {slug ? <p className="text-sm text-muted-foreground">/{slug}</p> : null}
      <div className="grid gap-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={name}
          disabled={!isManager}
          onChange={(event) => setName(event.target.value)}
        />
        {isManager && (
          <div>
            <Button onClick={saveName} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-destructive">Danger zone</p>
        <div className="mt-2">
          <Button
            variant="outline"
            className="text-destructive"
            onClick={leave}
            disabled={leaving}
          >
            {leaving ? "Leaving…" : "Leave organization"}
          </Button>
        </div>
      </div>
    </div>
  );
}
