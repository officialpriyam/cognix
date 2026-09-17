"use client";

import { authClient } from "auth/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Input } from "ui/input";
import { Label } from "ui/label";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 40);

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (organizationId: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const create = async () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedName) {
      toast.error("Give the organization a name first");
      return;
    }
    if (!trimmedSlug) {
      toast.error("URL slug cannot be empty");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await authClient.organization.create({
        name: trimmedName,
        slug: trimmedSlug,
      });
      if (error || !data) {
        throw new Error(error?.message || "Could not create organization");
      }
      await authClient.organization
        .setActive({ organizationId: data.id })
        .catch(() => {});
      toast.success(`"${trimmedName}" created`);
      setName("");
      setSlug("");
      setSlugTouched(false);
      onOpenChange(false);
      if (onCreated) {
        onCreated(data.id);
      } else {
        router.push(`/organization/${data.id}`);
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create organization",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a team organization to collaborate with others.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-org-name">Organization Name</Label>
            <Input
              id="new-org-name"
              placeholder="Acme Corp"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-org-slug">URL Slug</Label>
            <Input
              id="new-org-slug"
              placeholder="acme-corp"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs and references. Must be unique.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={creating}>
            {creating ? "Creating…" : "Create Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
