"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Checkbox } from "ui/checkbox";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Skeleton } from "ui/skeleton";
import { Switch } from "ui/switch";
import type { OrgDeploymentRow, OrgMemberRow, OrgPolicy } from "./org-shared";

interface PolicyPayload {
  policy: OrgPolicy;
  deployments: OrgDeploymentRow[];
  members: OrgMemberRow[];
  isManager: boolean;
}

const microsToUsd = (micros: number | null): string =>
  micros === null || micros === undefined ? "" : String(micros / 1_000_000);

const usdToMicros = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 1_000_000);
};

export function OrgAiPolicyTab({
  organizationId,
  isManager,
}: {
  organizationId: string;
  isManager: boolean;
}) {
  const [payload, setPayload] = useState<PolicyPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/organization/${organizationId}/ai-policy`,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as PolicyPayload;
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const sortedDeployments = useMemo(
    () =>
      (payload?.deployments ?? []).slice().sort((a, b) => {
        if (a.provider !== b.provider)
          return a.provider.localeCompare(b.provider);
        return a.model.localeCompare(b.model);
      }),
    [payload],
  );

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load AI policy right now. Please try again.
      </p>
    );
  }

  if (!payload) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const patchPolicy = (patch: Partial<OrgPolicy>) =>
    setPayload((current) =>
      current
        ? { ...current, policy: { ...current.policy, ...patch } }
        : current,
    );

  const patchDeployment = (
    deploymentId: string,
    patch: Partial<OrgDeploymentRow>,
  ) =>
    setPayload((current) =>
      current
        ? {
            ...current,
            deployments: current.deployments.map((d) =>
              d.deploymentId === deploymentId ? { ...d, ...patch } : d,
            ),
          }
        : current,
    );

  const patchMember = (memberId: string, patch: Partial<OrgMemberRow>) =>
    setPayload((current) =>
      current
        ? {
            ...current,
            members: current.members.map((m) =>
              m.memberId === memberId ? { ...m, ...patch } : m,
            ),
          }
        : current,
    );

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/organization/${organizationId}/ai-policy`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            automaticRoutingEnabled: payload.policy.automaticRoutingEnabled,
            browserAutomationEnabled: payload.policy.browserAutomationEnabled,
            deployments: payload.deployments.map((d) => ({
              deploymentId: d.deploymentId,
              enabled: d.enabled,
              inOverride: d.inOverride,
              outOverride: d.outOverride,
            })),
            members: payload.members.map((m) => ({
              memberId: m.memberId,
              monthlyCapMicros: m.monthlyCapMicros,
              hardStop: m.hardStop ?? true,
            })),
          }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || `Save failed (HTTP ${response.status})`);
      }
      toast.success("AI policy saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save AI policy",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">Automatic routing</p>
          <p className="text-xs text-muted-foreground">
            Select the best available model from the fixed task fit table.
          </p>
        </div>
        <Switch
          checked={payload.policy.automaticRoutingEnabled}
          disabled={!isManager}
          onCheckedChange={(checked) =>
            patchPolicy({ automaticRoutingEnabled: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">Browser automation</p>
          <p className="text-xs text-muted-foreground">
            Let members run the page-reader browse tool in chat.
          </p>
        </div>
        <Switch
          checked={payload.policy.browserAutomationEnabled}
          disabled={!isManager}
          onCheckedChange={(checked) =>
            patchPolicy({ browserAutomationEnabled: checked })
          }
        />
      </div>

      <div>
        <p className="text-sm font-medium">Available models</p>
        <p className="text-xs text-muted-foreground">
          Members can only select enabled deployments. Empty price fields
          inherit the base rate.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {sortedDeployments.map((deployment) => (
          <div
            key={deployment.deploymentId}
            className="rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={deployment.enabled}
                disabled={!isManager}
                onCheckedChange={(checked) =>
                  patchDeployment(deployment.deploymentId, {
                    enabled: checked === true,
                  })
                }
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {deployment.provider} / {deployment.model}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {deployment.isFree
                    ? "free tier"
                    : `${deployment.retention} retention`}
                  {deployment.tools ? " · tools" : ""}
                  {deployment.vision ? " · vision" : ""}
                </p>
                {!deployment.isFree && (
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    ${microsToUsd(deployment.inPrice) || "0"} / $
                    {microsToUsd(deployment.outPrice) || "0"} per 1M
                    input/output tokens
                  </p>
                )}
              </div>
              {deployment.isFree ? (
                <Badge variant="secondary">Free</Badge>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    disabled={!isManager}
                    className="h-8 w-24"
                    placeholder={microsToUsd(deployment.inPrice)}
                    value={microsToUsd(deployment.inOverride)}
                    onChange={(event) =>
                      patchDeployment(deployment.deploymentId, {
                        inOverride: usdToMicros(event.target.value),
                      })
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    disabled={!isManager}
                    className="h-8 w-24"
                    placeholder={microsToUsd(deployment.outPrice)}
                    value={microsToUsd(deployment.outOverride)}
                    onChange={(event) =>
                      patchDeployment(deployment.deploymentId, {
                        outOverride: usdToMicros(event.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-medium">Employee monthly allowance</p>
        <p className="text-xs text-muted-foreground">
          Monthly spending cap per member in micros. Leave empty for no cap.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {payload.members.map((member) => (
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
            <Input
              type="number"
              min={0}
              step={1}
              disabled={!isManager}
              className="h-8 w-32"
              placeholder="No cap"
              value={
                member.monthlyCapMicros === null ||
                member.monthlyCapMicros === undefined
                  ? ""
                  : String(member.monthlyCapMicros)
              }
              onChange={(event) => {
                const trimmed = event.target.value.trim();
                patchMember(member.memberId, {
                  monthlyCapMicros:
                    trimmed === ""
                      ? null
                      : Math.max(0, Math.floor(Number(trimmed) || 0)),
                });
              }}
            />
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={member.hardStop ?? true}
                disabled={!isManager}
                onCheckedChange={(checked) =>
                  patchMember(member.memberId, { hardStop: checked })
                }
              />
              Hard stop
            </Label>
          </div>
        ))}
      </div>

      {isManager ? (
        <div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save AI policy"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only owners and admins can edit AI policy.
        </p>
      )}
    </div>
  );
}
