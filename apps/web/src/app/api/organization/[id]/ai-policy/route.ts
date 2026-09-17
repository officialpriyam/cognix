import { withAuth } from "auth/route-guard";
import { invalidateRoutingCache } from "lib/ai/routing/service";
import { pgDb as db } from "lib/db/pg/db.pg";
import {
  MemberAiPolicyTable,
  MemberTable,
  ModelDeploymentTable,
  OrganizationAiPolicyTable,
  OrganizationModelAccessTable,
  OrganizationTable,
  UserTable,
} from "lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { aiPolicyPutSchema } from "./validations";

const MANAGER_ROLES = new Set(["owner", "admin"]);

async function requireOrgMember(organizationId: string, userId: string) {
  const [member] = await db
    .select()
    .from(MemberTable)
    .where(
      and(
        eq(MemberTable.organizationId, organizationId),
        eq(MemberTable.userId, userId),
      ),
    );
  return member ?? null;
}

/**
 * GET /api/organization/[id]/ai-policy
 *
 * Everything the workspace Manage page needs in one round trip: the org AI
 * policy, every active deployment with this org's access state, and the
 * member list with per-member AI caps. Any org member may read.
 */
export const GET = withAuth(
  async (
    _request: Request,
    session,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id: organizationId } = await context.params;
      const member = await requireOrgMember(organizationId, session.user.id);
      if (!member) {
        return NextResponse.json(
          { error: "Not a member of this organization" },
          { status: 404 },
        );
      }

      const [organization] = await db
        .select({
          id: OrganizationTable.id,
          name: OrganizationTable.name,
          slug: OrganizationTable.slug,
        })
        .from(OrganizationTable)
        .where(eq(OrganizationTable.id, organizationId));
      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }

      const [policy] = await db
        .select()
        .from(OrganizationAiPolicyTable)
        .where(eq(OrganizationAiPolicyTable.organizationId, organizationId));

      const deployments = await db
        .select({
          deploymentId: ModelDeploymentTable.id,
          provider: ModelDeploymentTable.provider,
          model: ModelDeploymentTable.providerModelId,
          retention: ModelDeploymentTable.dataRetention,
          inPrice: ModelDeploymentTable.inputPriceMicrosPerMillion,
          outPrice: ModelDeploymentTable.outputPriceMicrosPerMillion,
          ctx: ModelDeploymentTable.contextTokens,
          tools: ModelDeploymentTable.supportsTools,
          vision: ModelDeploymentTable.supportsVision,
          isFree: ModelDeploymentTable.isFree,
          enabled: OrganizationModelAccessTable.enabled,
          inOverride:
            OrganizationModelAccessTable.inputPriceMicrosPerMillionOverride,
          outOverride:
            OrganizationModelAccessTable.outputPriceMicrosPerMillionOverride,
        })
        .from(ModelDeploymentTable)
        .leftJoin(
          OrganizationModelAccessTable,
          and(
            eq(
              OrganizationModelAccessTable.deploymentId,
              ModelDeploymentTable.id,
            ),
            eq(OrganizationModelAccessTable.organizationId, organizationId),
          ),
        )
        .where(eq(ModelDeploymentTable.active, true));

      const members = await db
        .select({
          memberId: MemberTable.id,
          userId: MemberTable.userId,
          role: MemberTable.role,
          name: UserTable.name,
          email: UserTable.email,
          image: UserTable.image,
          monthlyCapMicros: MemberAiPolicyTable.monthlyCapMicros,
          hardStop: MemberAiPolicyTable.hardStop,
        })
        .from(MemberTable)
        .innerJoin(UserTable, eq(UserTable.id, MemberTable.userId))
        .leftJoin(
          MemberAiPolicyTable,
          eq(MemberAiPolicyTable.memberId, MemberTable.id),
        )
        .where(eq(MemberTable.organizationId, organizationId));

      return NextResponse.json({
        organization,
        policy: {
          automaticRoutingEnabled: policy?.automaticRoutingEnabled ?? true,
          browserAutomationEnabled: policy?.browserAutomationEnabled ?? true,
          maxInputPriceMicrosPerMillion:
            policy?.maxInputPriceMicrosPerMillion ?? null,
          maxOutputPriceMicrosPerMillion:
            policy?.maxOutputPriceMicrosPerMillion ?? null,
          maxEstimatedRequestMicros: policy?.maxEstimatedRequestMicros ?? null,
          allowedRegions: policy?.allowedRegions ?? null,
        },
        deployments: deployments.map((d) => ({
          ...d,
          // No access row yet (e.g. a deployment added after the org's first
          // use) reads as enabled: admins opt out explicitly, never implicitly.
          enabled: d.enabled ?? true,
        })),
        members,
        isManager: MANAGER_ROLES.has(member.role),
      });
    } catch (error) {
      console.error("Failed to load organization AI policy:", error);
      return NextResponse.json(
        { error: "Failed to load organization AI policy" },
        { status: 500 },
      );
    }
  },
);

/**
 * PUT /api/organization/[id]/ai-policy
 *
 * Saves the org AI policy: routing toggles, price ceilings, per-deployment
 * access + price overrides, and per-member monthly caps. Owners/admins only.
 */
export const PUT = withAuth(
  async (
    request: Request,
    session,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id: organizationId } = await context.params;
      const member = await requireOrgMember(organizationId, session.user.id);
      if (!member || !MANAGER_ROLES.has(member.role)) {
        return NextResponse.json(
          { error: "Only organization owners and admins can edit AI policy" },
          { status: 403 },
        );
      }

      const parsed = aiPolicyPutSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid AI policy data", issues: parsed.error.issues },
          { status: 400 },
        );
      }
      const body = parsed.data;

      // Cross-org writes are rejected: deployments are global, but access rows
      // may only reference deployments, and member caps only this org's rows.
      const orgMemberIds = new Set(
        (
          await db
            .select({ id: MemberTable.id })
            .from(MemberTable)
            .where(eq(MemberTable.organizationId, organizationId))
        ).map((row) => row.id),
      );

      await db.transaction(async (tx) => {
        await tx
          .insert(OrganizationAiPolicyTable)
          .values({
            organizationId,
            ...(body.automaticRoutingEnabled !== undefined
              ? { automaticRoutingEnabled: body.automaticRoutingEnabled }
              : {}),
            ...(body.browserAutomationEnabled !== undefined
              ? { browserAutomationEnabled: body.browserAutomationEnabled }
              : {}),
            ...(body.maxInputPriceMicrosPerMillion !== undefined
              ? {
                  maxInputPriceMicrosPerMillion:
                    body.maxInputPriceMicrosPerMillion,
                }
              : {}),
            ...(body.maxOutputPriceMicrosPerMillion !== undefined
              ? {
                  maxOutputPriceMicrosPerMillion:
                    body.maxOutputPriceMicrosPerMillion,
                }
              : {}),
            ...(body.maxEstimatedRequestMicros !== undefined
              ? { maxEstimatedRequestMicros: body.maxEstimatedRequestMicros }
              : {}),
            ...(body.allowedRegions !== undefined
              ? { allowedRegions: body.allowedRegions }
              : {}),
          })
          .onConflictDoUpdate({
            target: OrganizationAiPolicyTable.organizationId,
            set: {
              ...(body.automaticRoutingEnabled !== undefined
                ? { automaticRoutingEnabled: body.automaticRoutingEnabled }
                : {}),
              ...(body.browserAutomationEnabled !== undefined
                ? { browserAutomationEnabled: body.browserAutomationEnabled }
                : {}),
              ...(body.maxInputPriceMicrosPerMillion !== undefined
                ? {
                    maxInputPriceMicrosPerMillion:
                      body.maxInputPriceMicrosPerMillion,
                  }
                : {}),
              ...(body.maxOutputPriceMicrosPerMillion !== undefined
                ? {
                    maxOutputPriceMicrosPerMillion:
                      body.maxOutputPriceMicrosPerMillion,
                  }
                : {}),
              ...(body.maxEstimatedRequestMicros !== undefined
                ? { maxEstimatedRequestMicros: body.maxEstimatedRequestMicros }
                : {}),
              ...(body.allowedRegions !== undefined
                ? { allowedRegions: body.allowedRegions }
                : {}),
            },
          });

        for (const deployment of body.deployments ?? []) {
          await tx
            .insert(OrganizationModelAccessTable)
            .values({
              organizationId,
              deploymentId: deployment.deploymentId,
              enabled: deployment.enabled,
              ...(deployment.inOverride !== undefined
                ? { inputPriceMicrosPerMillionOverride: deployment.inOverride }
                : {}),
              ...(deployment.outOverride !== undefined
                ? {
                    outputPriceMicrosPerMillionOverride: deployment.outOverride,
                  }
                : {}),
            })
            .onConflictDoUpdate({
              target: [
                OrganizationModelAccessTable.organizationId,
                OrganizationModelAccessTable.deploymentId,
              ],
              set: {
                enabled: deployment.enabled,
                ...(deployment.inOverride !== undefined
                  ? {
                      inputPriceMicrosPerMillionOverride: deployment.inOverride,
                    }
                  : {}),
                ...(deployment.outOverride !== undefined
                  ? {
                      outputPriceMicrosPerMillionOverride:
                        deployment.outOverride,
                    }
                  : {}),
              },
            });
        }

        for (const entry of body.members ?? []) {
          if (!orgMemberIds.has(entry.memberId)) continue;
          await tx
            .insert(MemberAiPolicyTable)
            .values({
              memberId: entry.memberId,
              ...(entry.monthlyCapMicros !== undefined
                ? { monthlyCapMicros: entry.monthlyCapMicros }
                : {}),
              ...(entry.hardStop !== undefined
                ? { hardStop: entry.hardStop }
                : {}),
            })
            .onConflictDoUpdate({
              target: MemberAiPolicyTable.memberId,
              set: {
                ...(entry.monthlyCapMicros !== undefined
                  ? { monthlyCapMicros: entry.monthlyCapMicros }
                  : {}),
                ...(entry.hardStop !== undefined
                  ? { hardStop: entry.hardStop }
                  : {}),
              },
            });
        }
      });

      invalidateRoutingCache(organizationId);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to save organization AI policy:", error);
      return NextResponse.json(
        { error: "Failed to save organization AI policy" },
        { status: 500 },
      );
    }
  },
);
