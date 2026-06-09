"use client";

import { Visibility } from "@/components/shareable-actions";
import { ShareableCard } from "@/components/shareable-card";
import { useMutateAgents } from "@/hooks/queries/use-agents";
import { useBookmark } from "@/hooks/queries/use-bookmark";
import { cn } from "@/lib/utils";
import { AgentSummary, AgentUpdateSchema } from "app-types/agent";
import { canCreateAgent } from "lib/auth/client-permissions";
import { notify } from "lib/notify";
import { fetcher } from "lib/utils";
import {
  ArrowUpRight,
  BotIcon,
  BriefcaseBusinessIcon,
  Code2Icon,
  LineChartIcon,
  Plus,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { safe } from "ts-safe";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Input } from "ui/input";
import { handleErrorWithToast } from "ui/shared-toast";

interface AgentsListProps {
  initialMyAgents: AgentSummary[];
  initialSharedAgents: AgentSummary[];
  userId: string;
  userRole?: string | null;
}

type AgentCategory = "all" | "general" | "coding" | "research" | "business";

const agentCategories = [
  {
    id: "all",
    label: "All",
    icon: SparklesIcon,
  },
  {
    id: "general",
    label: "General",
    icon: BotIcon,
  },
  {
    id: "coding",
    label: "Coding",
    icon: Code2Icon,
  },
  {
    id: "research",
    label: "Research",
    icon: LineChartIcon,
  },
  {
    id: "business",
    label: "Business",
    icon: BriefcaseBusinessIcon,
  },
] satisfies Array<{
  id: AgentCategory;
  label: string;
  icon: typeof SparklesIcon;
}>;

const getAgentText = (agent: AgentSummary) => {
  const instructions = (
    agent as AgentSummary & {
      instructions?: { role?: string; systemPrompt?: string };
    }
  ).instructions;

  return `${agent.name} ${agent.description ?? ""} ${
    instructions?.role ?? ""
  } ${instructions?.systemPrompt ?? ""}`.toLowerCase();
};

const inferAgentCategory = (
  agent: AgentSummary,
): Exclude<AgentCategory, "all"> => {
  const text = getAgentText(agent);

  if (
    /code|coding|developer|typescript|javascript|python|debug|repo|software/.test(
      text,
    )
  ) {
    return "coding";
  }

  if (/research|study|paper|analysis|summarize|data|report/.test(text)) {
    return "research";
  }

  if (/sales|finance|business|marketing|support|hr|team|customer/.test(text)) {
    return "business";
  }

  return "general";
};

const filterAgents = (
  agents: AgentSummary[],
  search: string,
  category: AgentCategory,
) => {
  const query = search.trim().toLowerCase();

  return agents.filter((agent) => {
    const text = getAgentText(agent);
    const matchesSearch = !query || text.includes(query);
    const matchesCategory =
      category === "all" || inferAgentCategory(agent) === category;

    return matchesSearch && matchesCategory;
  });
};

function EmptyAgentState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="col-span-full border-dashed bg-transparent">
      <CardHeader className="items-center py-10 text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-secondary">
          <BotIcon className="size-5 text-secondary-foreground" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function CreateAgentCard() {
  return (
    <Link href="/agent/new" className="group">
      <Card
        className="min-h-[196px] border-dashed bg-secondary/30 transition-colors hover:bg-input/80"
        data-testid="create-agent-card"
      >
        <CardHeader>
          <div className="mb-4 flex size-11 items-center justify-center rounded-lg border bg-background transition-transform group-hover:-translate-y-0.5">
            <Plus className="size-5" />
          </div>
          <CardTitle>
            <h2 className="text-lg font-semibold">Create New Agent</h2>
          </CardTitle>
          <CardDescription>
            Build an agent with instructions, tools, visibility, and an icon.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <Button variant="ghost" size="sm" className="icon-motion-slide px-0">
            Start
            <ArrowUpRight className="size-3.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AgentsList({
  initialMyAgents,
  initialSharedAgents,
  userId,
  userRole,
}: AgentsListProps) {
  const t = useTranslations();
  const mutateAgents = useMutateAgents();
  const [deletingAgentLoading, setDeletingAgentLoading] = useState<
    string | null
  >(null);
  const [visibilityChangeLoading, setVisibilityChangeLoading] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AgentCategory>("all");

  const { data: allAgents } = useSWR(
    "/api/agent?filters=mine,shared",
    fetcher,
    {
      fallbackData: [...initialMyAgents, ...initialSharedAgents],
    },
  );

  const myAgents =
    allAgents?.filter((agent: AgentSummary) => agent.userId === userId) ||
    initialMyAgents;

  const sharedAgents =
    allAgents?.filter((agent: AgentSummary) => agent.userId !== userId) ||
    initialSharedAgents;

  const visibleMyAgents = useMemo(
    () => filterAgents(myAgents, search, category),
    [myAgents, search, category],
  );
  const visibleSharedAgents = useMemo(
    () => filterAgents(sharedAgents, search, category),
    [sharedAgents, search, category],
  );

  const { toggleBookmark: toggleBookmarkHook, isLoading: isBookmarkLoading } =
    useBookmark({
      itemType: "agent",
    });

  const toggleBookmark = async (agentId: string, isBookmarked: boolean) => {
    await toggleBookmarkHook({ id: agentId, isBookmarked });
  };

  const updateVisibility = async (agentId: string, visibility: Visibility) => {
    safe(() => setVisibilityChangeLoading(agentId))
      .map(() => AgentUpdateSchema.parse({ visibility }))
      .map(JSON.stringify)
      .map(async (body) =>
        fetcher(`/api/agent/${agentId}`, {
          method: "PUT",
          body,
        }),
      )
      .ifOk(() => {
        mutateAgents({ id: agentId, visibility });
        toast.success(t("Agent.visibilityUpdated"));
      })
      .ifFail((e) => {
        handleErrorWithToast(e);
        toast.error(t("Common.error"));
      })
      .watch(() => setVisibilityChangeLoading(null));
  };

  const deleteAgent = async (agentId: string) => {
    const ok = await notify.confirm({
      description: t("Agent.deleteConfirm"),
    });
    if (!ok) return;
    safe(() => setDeletingAgentLoading(agentId))
      .map(() =>
        fetcher(`/api/agent/${agentId}`, {
          method: "DELETE",
        }),
      )
      .ifOk(() => {
        mutateAgents({ id: agentId }, true);
        toast.success(t("Agent.deleted"));
      })
      .ifFail((e) => {
        handleErrorWithToast(e);
        toast.error(t("Common.error"));
      })
      .watch(() => setDeletingAgentLoading(null));
  };

  const canCreate = canCreateAgent(userRole);
  const showCreateCard = canCreate && !search.trim() && category === "all";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:p-8">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">
              Agent Marketplace
            </Badge>
            <h1
              className="text-3xl font-semibold tracking-tight"
              data-testid="agents-title"
            >
              Agent Marketplace
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Discover, create, bookmark, and share agents for focused work.
            </p>
          </div>

          {canCreate && (
            <Button asChild className="icon-motion-orbit">
              <Link href="/agent/new" data-testid="create-agent-button">
                <Plus className="size-4" />
                {t("Agent.newAgent")}
              </Link>
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agents..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {agentCategories.map((item) => {
              const Icon = item.icon;
              const active = category === item.id;

              return (
                <Button
                  key={item.id}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "icon-motion-slide rounded-full",
                    active && "border border-border",
                  )}
                  onClick={() => setCategory(item.id)}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {canCreate && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{t("Agent.myAgents")}</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {showCreateCard && <CreateAgentCard />}
            {visibleMyAgents.map((agent) => (
              <ShareableCard
                key={agent.id}
                type="agent"
                item={agent}
                href={`/agent/${agent.id}`}
                onVisibilityChange={updateVisibility}
                isVisibilityChangeLoading={visibilityChangeLoading === agent.id}
                isDeleteLoading={deletingAgentLoading === agent.id}
                onDelete={deleteAgent}
              />
            ))}
            {!showCreateCard && visibleMyAgents.length === 0 && (
              <EmptyAgentState
                title="No matching agents"
                description="Try a different search or category."
              />
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {canCreate ? t("Agent.sharedAgents") : t("Agent.availableAgents")}
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleSharedAgents.map((agent) => (
            <ShareableCard
              key={agent.id}
              type="agent"
              item={agent}
              isOwner={false}
              href={`/agent/${agent.id}`}
              onBookmarkToggle={toggleBookmark}
              isBookmarkToggleLoading={isBookmarkLoading(agent.id)}
            />
          ))}
          {visibleSharedAgents.length === 0 && (
            <EmptyAgentState
              title={
                search.trim() || category !== "all"
                  ? "No matching shared agents"
                  : canCreate
                    ? t("Agent.noSharedAgents")
                    : t("Agent.noAvailableAgents")
              }
              description={
                search.trim() || category !== "all"
                  ? "Try a different search or category."
                  : canCreate
                    ? t("Agent.noSharedAgentsDescription")
                    : t("Agent.noAvailableAgentsDescription")
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
