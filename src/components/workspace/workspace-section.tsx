"use client";

import { cn } from "@/lib/utils";
import {
  BookmarkIcon,
  BrainIcon,
  FileArchiveIcon,
  FileTextIcon,
  type LucideIcon,
  MessageSquareQuoteIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
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
import { Textarea } from "ui/textarea";

type SectionId = "prompts" | "memories" | "bookmarks" | "files" | "skills";

type WorkspaceItem = {
  id: string;
  title: string;
  description: string;
  body: string;
  createdAt: string;
  meta?: string;
};

type DraftItem = Pick<WorkspaceItem, "title" | "description" | "body">;

type SectionConfig = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  actionLabel: string;
  icon: LucideIcon;
};

const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: "prompts",
    label: "Prompts",
    title: "Prompt Library",
    description: "Reusable prompt templates for repeat workflows.",
    emptyTitle: "No prompts yet",
    emptyDescription: "Create a reusable prompt to keep common tasks close.",
    actionLabel: "New Prompt",
    icon: MessageSquareQuoteIcon,
  },
  {
    id: "memories",
    label: "Memories",
    title: "Memory Vault",
    description: "Saved facts and preferences for future conversations.",
    emptyTitle: "No memories yet",
    emptyDescription: "Store a memory when there is something worth reusing.",
    actionLabel: "Create Memory",
    icon: BrainIcon,
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    title: "Bookmarks",
    description: "Pinned chats, agents, workflows, and references.",
    emptyTitle: "No bookmarks yet",
    emptyDescription: "Add a bookmark for anything you want to revisit.",
    actionLabel: "New Bookmark",
    icon: BookmarkIcon,
  },
  {
    id: "files",
    label: "Files",
    title: "My Files",
    description: "A file index for uploaded research and chat assets.",
    emptyTitle: "No files yet",
    emptyDescription: "Upload files to start building your workspace index.",
    actionLabel: "Upload Files",
    icon: FileArchiveIcon,
  },
  {
    id: "skills",
    label: "Skills",
    title: "Skills",
    description: "Instruction packs agents can reuse for specialized tasks.",
    emptyTitle: "No skills yet",
    emptyDescription: "Write a skill to capture a repeatable behavior.",
    actionLabel: "Write Skill",
    icon: WrenchIcon,
  },
];

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getDefaultDraft = (section: SectionId): DraftItem => {
  if (section === "memories") {
    return {
      title: "",
      description: "Memory",
      body: "",
    };
  }

  if (section === "skills") {
    return {
      title: "",
      description: "",
      body: "",
    };
  }

  return {
    title: "",
    description: "",
    body: "",
  };
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const safeParseWorkspaceItems = (raw: string): WorkspaceItem[] => {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export function WorkspaceSection({ section }: { section: string }) {
  const activeSection = section as SectionId;
  const config =
    SECTION_CONFIGS.find((item) => item.id === activeSection) ??
    SECTION_CONFIGS[0];
  const Icon = config.icon;
  const storageKey = `cognix-workspace:${activeSection}`;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftItem>(getDefaultDraft(activeSection));

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    const nextItems = raw ? safeParseWorkspaceItems(raw) : [];
    setItems(Array.isArray(nextItems) ? nextItems : []);
    setDraft(getDefaultDraft(activeSection));
    setLoadedKey(storageKey);
  }, [activeSection, storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, loadedKey, storageKey]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;

    return items.filter((item) => {
      return [item.title, item.description, item.body, item.meta]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
    });
  }, [items, query]);

  const openCreateDialog = () => {
    setDraft(getDefaultDraft(activeSection));
    setDialogOpen(true);
  };

  const createItem = () => {
    const title = draft.title.trim();
    if (!title) return;

    setItems((current) => [
      {
        id: createId(),
        title,
        description: draft.description.trim(),
        body: draft.body.trim(),
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setDialogOpen(false);
  };

  const deleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setItems((current) => [
      ...files.map((file) => ({
        id: createId(),
        title: file.name,
        description: file.type || "File",
        body: formatFileSize(file.size),
        meta: file.lastModified
          ? new Date(file.lastModified).toLocaleDateString()
          : undefined,
        createdAt: new Date().toISOString(),
      })),
      ...current,
    ]);
    event.target.value = "";
  };

  const handlePrimaryAction = () => {
    if (activeSection === "files") {
      fileInputRef.current?.click();
      return;
    }

    openCreateDialog();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-secondary/60 text-secondary-foreground">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                {config.title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={addFiles}
            />
            {activeSection === "files" && (
              <Button
                variant="outline"
                className="icon-motion-pop"
                onClick={openCreateDialog}
              >
                <FileTextIcon className="size-4" />
                Add Note
              </Button>
            )}
            <Button className="icon-motion-orbit" onClick={handlePrimaryAction}>
              {activeSection === "files" ? (
                <UploadIcon className="size-4" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {config.actionLabel}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {SECTION_CONFIGS.map((item) => {
              const ItemIcon = item.icon;

              return (
                <Button
                  key={item.id}
                  asChild
                  variant={item.id === activeSection ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "icon-motion-slide rounded-full",
                    item.id === activeSection && "border border-border",
                  )}
                >
                  <Link href={`/workspace/${item.id}`}>
                    <ItemIcon className="size-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}...`}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="border-dashed bg-transparent">
          <CardHeader className="items-center py-14 text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-secondary">
              <Icon className="size-5 text-secondary-foreground" />
            </div>
            <CardTitle>{config.emptyTitle}</CardTitle>
            <CardDescription>{config.emptyDescription}</CardDescription>
            <Button
              className="icon-motion-pop mt-2"
              size="sm"
              onClick={handlePrimaryAction}
            >
              {activeSection === "files" ? (
                <UploadIcon className="size-4" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {config.actionLabel}
            </Button>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="group min-h-48 overflow-hidden transition-colors hover:bg-input/40"
            >
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {item.description || item.meta || "Workspace item"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="icon-motion-pop size-8 shrink-0 opacity-70 hover:text-destructive group-hover:opacity-100"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2Icon className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{config.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.body || "No details added."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {activeSection === "files" ? "Add File Note" : config.actionLabel}
            </DialogTitle>
            <DialogDescription>
              {activeSection === "skills"
                ? "Create reusable instructions for agents and workflows."
                : "Save a reusable workspace item."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="workspace-title">
                {activeSection === "memories"
                  ? "Key"
                  : activeSection === "skills"
                    ? "Name"
                    : "Title"}
              </Label>
              <Input
                id="workspace-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={
                  activeSection === "memories"
                    ? "preferred_model"
                    : activeSection === "skills"
                      ? "brand-guidelines"
                      : "Name"
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="workspace-description">
                {activeSection === "memories" ? "Type" : "Description"}
              </Label>
              <Input
                id="workspace-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={
                  activeSection === "memories"
                    ? "Preference"
                    : "Short description"
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="workspace-body">
                {activeSection === "memories"
                  ? "Value"
                  : activeSection === "skills"
                    ? "Instructions"
                    : "Text"}
              </Label>
              <Textarea
                id="workspace-body"
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder={
                  activeSection === "skills"
                    ? "Write the skill instructions in markdown..."
                    : "Details"
                }
                className="min-h-36 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="icon-motion-pop"
              onClick={createItem}
              disabled={!draft.title.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
