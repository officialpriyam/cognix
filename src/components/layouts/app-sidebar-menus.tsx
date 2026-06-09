"use client";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "ui/sidebar";
import { SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroupContent } from "ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { useArchives } from "@/hooks/queries/use-archives";
import { BasicUser } from "app-types/user";
import { Shortcuts, getShortcutKeyList } from "lib/keyboard-shortcuts";
import { getIsUserAdmin } from "lib/user/utils";
import {
  BookmarkIcon,
  BotIcon,
  BrainIcon,
  FileArchiveIcon,
  FolderOpenIcon,
  FolderSearchIcon,
  LibraryIcon,
  MessageSquareQuoteIcon,
  PlusIcon,
  Waypoints,
  WrenchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { MCPIcon } from "ui/mcp-icon";
import { SidebarGroup } from "ui/sidebar";
import { Skeleton } from "ui/skeleton";
import { WriteIcon } from "ui/write-icon";
import { ArchiveDialog } from "../archive-dialog";
import { AppSidebarAdmin } from "./app-sidebar-menu-admin";

export function AppSidebarMenus({ user }: { user?: BasicUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("");
  const { setOpenMobile } = useSidebar();
  const [expandedWorkspace, setExpandedWorkspace] = useState(false);
  const [expandedArchive, setExpandedArchive] = useState(false);
  const [addArchiveDialogOpen, setAddArchiveDialogOpen] = useState(false);

  const { data: archives, isLoading: isLoadingArchives } = useArchives();
  const toggleWorkspace = useCallback(() => {
    setExpandedWorkspace((prev) => !prev);
  }, []);
  const toggleArchive = useCallback(() => {
    setExpandedArchive((prev) => !prev);
  }, []);

  const workspaceLinks = [
    {
      href: "/agents",
      label: "Agent Marketplace",
      icon: BotIcon,
    },
    {
      href: "/agent/new",
      label: "Create Agent",
      icon: PlusIcon,
    },
    {
      href: "/workspace/prompts",
      label: "Prompts",
      icon: MessageSquareQuoteIcon,
    },
    {
      href: "/workspace/memories",
      label: "Memories",
      icon: BrainIcon,
    },
    {
      href: "/workspace/bookmarks",
      label: "Bookmarks",
      icon: BookmarkIcon,
    },
    {
      href: "/workspace/files",
      label: "Files",
      icon: FileArchiveIcon,
    },
    {
      href: "/workspace/skills",
      label: "Skills",
      icon: WrenchIcon,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem className="mb-1">
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenMobile(false);
                  router.push(`/`);
                  router.refresh();
                }}
              >
                <SidebarMenuButton className="icon-motion-slide flex font-semibold group/new-chat bg-input/20 border border-border/40">
                  <WriteIcon className="size-4" />
                  {t("Layout.newChat")}
                  <div className="flex items-center gap-1 text-xs font-medium ml-auto opacity-0 group-hover/new-chat:opacity-100 transition-opacity">
                    {getShortcutKeyList(Shortcuts.openNewChat).map((key) => (
                      <span
                        key={key}
                        className="border w-5 h-5 flex items-center justify-center bg-accent rounded"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem>
              <Link href="/mcp">
                <SidebarMenuButton className="icon-motion-pop font-semibold">
                  <MCPIcon className="size-4 fill-accent-foreground" />
                  {t("Layout.mcpConfiguration")}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem>
              <Link href="/workflow">
                <SidebarMenuButton className="icon-motion-slide font-semibold">
                  <Waypoints className="size-4" />
                  {t("Layout.workflow")}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
        <SidebarMenu className="group/workspace">
          <Tooltip>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleWorkspace}
                className="icon-motion-pop font-semibold"
              >
                <LibraryIcon className="size-4" />
                Workspace
              </SidebarMenuButton>
              <SidebarMenuAction
                className="group-hover/workspace:opacity-100 opacity-0 transition-opacity"
                onClick={() => router.push("/agent/new")}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PlusIcon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    Create agent
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuAction>
            </SidebarMenuItem>
          </Tooltip>
          {expandedWorkspace && (
            <SidebarMenuSub>
              {workspaceLinks.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <SidebarMenuSubItem key={item.href}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === item.href}
                      className="icon-motion-slide"
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpenMobile(false)}
                      >
                        <ItemIcon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          )}
        </SidebarMenu>
        {getIsUserAdmin(user) && <AppSidebarAdmin />}
        <SidebarMenu className="group/archive">
          <Tooltip>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleArchive}
                className="font-semibold"
              >
                {expandedArchive ? (
                  <FolderOpenIcon className="size-4" />
                ) : (
                  <FolderSearchIcon className="size-4" />
                )}
                {t("Archive.title")}
              </SidebarMenuButton>
              <SidebarMenuAction
                className="group-hover/archive:opacity-100 opacity-0 transition-opacity"
                onClick={() => setAddArchiveDialogOpen(true)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PlusIcon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    {t("Archive.addArchive")}
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuAction>
            </SidebarMenuItem>
          </Tooltip>
          {expandedArchive && (
            <>
              <SidebarMenuSub>
                {isLoadingArchives ? (
                  <div className="gap-2 flex flex-col">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                ) : archives!.length === 0 ? (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton className="text-muted-foreground">
                      {t("Archive.noArchives")}
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : (
                  archives!.map((archive) => (
                    <SidebarMenuSubItem
                      onClick={() => {
                        router.push(`/archive/${archive.id}`);
                      }}
                      key={archive.id}
                      className="cursor-pointer"
                    >
                      <SidebarMenuSubButton>
                        {archive.name}
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))
                )}
              </SidebarMenuSub>
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
      <ArchiveDialog
        open={addArchiveDialogOpen}
        onOpenChange={setAddArchiveDialogOpen}
      />
    </SidebarGroup>
  );
}
