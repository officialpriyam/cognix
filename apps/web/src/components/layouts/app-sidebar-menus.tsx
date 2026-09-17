"use client";
import { SidebarMenuAction, SidebarMenuButton, useSidebar } from "ui/sidebar";
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroupContent } from "ui/sidebar";

import { SidebarGroup } from "ui/sidebar";
import Link from "next/link";
import { getShortcutKeyList, Shortcuts } from "lib/keyboard-shortcuts";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { WriteIcon } from "ui/write-icon";
import { FolderSearchIcon, PlusIcon, Waypoints } from "lucide-react";
import {
  BookmarkIcon,
  BotIcon,
  BrainIcon,
  FileArchiveIcon,
  ImageIcon,
  LibraryIcon,
  MessageSquareQuoteIcon,
  WrenchIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { ProjectDialog } from "../projects/project-dialog";
import { getIsUserAdmin } from "lib/user/utils";
import { BasicUser } from "app-types/user";
import { AppSidebarAdmin } from "./app-sidebar-menu-admin";

export function AppSidebarMenus({ user }: { user?: BasicUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("");
  const { setOpenMobile } = useSidebar();
  const [addProjectDialogOpen, setAddProjectDialogOpen] = useState(false);
  const [expandedWorkspace, setExpandedWorkspace] = useState(false);
  const toggleWorkspace = useCallback(() => {
    setExpandedWorkspace((prev) => !prev);
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
                  // Only call refresh when already on "/": push already generates
                  // a fresh UUID server-side, so calling both would render the
                  // page twice with two different UUIDs and make the chat window
                  // visibly reload.
                  if (pathname === "/") {
                    router.refresh();
                  } else {
                    router.push("/");
                  }
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
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem>
              <Link href="/imagine" onClick={() => setOpenMobile(false)}>
                <SidebarMenuButton className="icon-motion-pop font-semibold">
                  <ImageIcon className="size-4" />
                  Imagine
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
        <SidebarMenu className="group/project">
          <Tooltip>
            <SidebarMenuItem>
              <Link href="/projects" onClick={() => setOpenMobile(false)}>
                <SidebarMenuButton className="icon-motion-pop font-semibold">
                  <FolderSearchIcon className="size-4" />
                  Projects
                </SidebarMenuButton>
              </Link>
              <SidebarMenuAction
                className="group-hover/project:opacity-100 opacity-0 transition-opacity"
                onClick={() => setAddProjectDialogOpen(true)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PlusIcon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    New project
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuAction>
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
      </SidebarGroupContent>
      <ProjectDialog
        open={addProjectDialogOpen}
        onOpenChange={setAddProjectDialogOpen}
      >
        <span />
      </ProjectDialog>
    </SidebarGroup>
  );
}
