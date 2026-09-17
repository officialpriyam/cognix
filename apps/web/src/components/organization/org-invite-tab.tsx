"use client";

import { authClient } from "auth/client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";

export function OrgInviteTab({ organizationId }: { organizationId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [sending, setSending] = useState(false);

  const sendInvitation = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter an email address first");
      return;
    }
    setSending(true);
    try {
      const { error } = await authClient.organization.inviteMember({
        organizationId,
        email: trimmed,
        role,
      });
      if (error) throw new Error(error.message || "Invitation failed");
      toast.success(`Invitation sent to ${trimmed}`);
      setEmail("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send invitation",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="org-invite-email">Email address</Label>
        <Input
          id="org-invite-email"
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void sendInvitation();
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label>Role</Label>
        <Select
          value={role}
          onValueChange={(value) => setRole(value as "member" | "admin")}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">
              Member — can use organization resources
            </SelectItem>
            <SelectItem value="admin">
              Admin — can invite members and manage settings
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button onClick={sendInvitation} disabled={sending}>
          {sending ? "Sending…" : "Send invitation"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Invited people join this organization when they accept. Someone who
        already belongs to another team workspace cannot accept.
      </p>
    </div>
  );
}
