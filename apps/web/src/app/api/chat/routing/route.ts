import { withAuth } from "auth/route-guard";
import globalLogger from "logger";
import { getAvailableOrganizationModels } from "lib/ai/routing/service";

const logger = globalLogger.withDefaults({
  message: "GET /api/chat/routing: ",
});

export const GET = withAuth(async (_request, session) => {
  try {
    const organizationId = (
      session.session as { activeOrganizationId?: string | null } | undefined
    )?.activeOrganizationId;
    const result = await getAvailableOrganizationModels({
      organizationId,
      userId: session.user.id,
    });

    return Response.json({
      enabled: result.automaticRoutingEnabled && result.models.length > 0,
      candidateCount: result.models.length,
    });
  } catch (error) {
    logger.error("Failed to resolve routing candidates", error);
    return Response.json(
      { error: "Failed to resolve routing candidates" },
      { status: 500 },
    );
  }
});
