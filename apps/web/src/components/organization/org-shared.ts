/** Compact human formatting for micro-unit billing values. */
export function formatMicros(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export type OrgTabId =
  | "members"
  | "invite"
  | "usage"
  | "ai-policy"
  | "settings";

export interface OrgMemberRow {
  memberId: string;
  userId: string;
  role: string;
  name: string | null;
  email: string;
  image?: string | null;
  monthlyCapMicros: number | null;
  hardStop: boolean | null;
}

export interface OrgDeploymentRow {
  deploymentId: string;
  provider: string;
  model: string;
  retention: string;
  inPrice: number;
  outPrice: number;
  ctx: number;
  tools: boolean;
  vision: boolean;
  isFree: boolean;
  enabled: boolean;
  inOverride: number | null;
  outOverride: number | null;
}

export interface OrgPolicy {
  automaticRoutingEnabled: boolean;
  browserAutomationEnabled: boolean;
  maxInputPriceMicrosPerMillion: number | null;
  maxOutputPriceMicrosPerMillion: number | null;
  maxEstimatedRequestMicros: number | null;
  allowedRegions: string[] | null;
}
