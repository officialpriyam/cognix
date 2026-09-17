import { withAuth } from "auth/route-guard";
import { pgDb as db } from "lib/db/pg/db.pg";
import {
  MemberAiUsagePeriodTable,
  MemberTable,
  UserTable,
} from "lib/db/pg/schema.pg";
import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

const USAGE_WINDOW_DAYS = 30;

/**
 * GET /api/organization/[id]/usage
 *
 * Organization AI spend over the trailing 30 days, in micros (the same unit
 * reservations and member caps use), with a per-member breakdown. Any org
 * member may read; values are recorded costs, never estimates.
 */
export const GET = withAuth(
  async (
    _request: Request,
    session,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id: organizationId } = await context.params;
      const [member] = await db
        .select({ id: MemberTable.id })
        .from(MemberTable)
        .where(
          and(
            eq(MemberTable.organizationId, organizationId),
            eq(MemberTable.userId, session.user.id),
          ),
        );
      if (!member) {
        return NextResponse.json(
          { error: "Not a member of this organization" },
          { status: 404 },
        );
      }

      const from = new Date();
      from.setDate(from.getDate() - USAGE_WINDOW_DAYS);

      const rows = await db
        .select({
          memberId: MemberTable.id,
          name: UserTable.name,
          email: UserTable.email,
          role: MemberTable.role,
          finalizedMicros: sql<number>`COALESCE(SUM(${MemberAiUsagePeriodTable.finalizedMicros}), 0)`,
          reservedMicros: sql<number>`COALESCE(SUM(${MemberAiUsagePeriodTable.reservedMicros}), 0)`,
        })
        .from(MemberTable)
        .innerJoin(UserTable, eq(UserTable.id, MemberTable.userId))
        .leftJoin(
          MemberAiUsagePeriodTable,
          and(
            eq(MemberAiUsagePeriodTable.memberId, MemberTable.id),
            gte(MemberAiUsagePeriodTable.periodStart, from),
          ),
        )
        .where(eq(MemberTable.organizationId, organizationId))
        .groupBy(
          MemberTable.id,
          UserTable.name,
          UserTable.email,
          MemberTable.role,
        );

      const members = rows.map((row) => ({
        ...row,
        finalizedMicros: Number(row.finalizedMicros),
        reservedMicros: Number(row.reservedMicros),
      }));
      const totals = members.reduce(
        (acc, row) => ({
          finalizedMicros: acc.finalizedMicros + row.finalizedMicros,
          reservedMicros: acc.reservedMicros + row.reservedMicros,
        }),
        { finalizedMicros: 0, reservedMicros: 0 },
      );

      return NextResponse.json({
        period: {
          from: from.toISOString(),
          to: new Date().toISOString(),
          days: USAGE_WINDOW_DAYS,
        },
        totals,
        members,
      });
    } catch (error) {
      console.error("Failed to load organization usage:", error);
      return NextResponse.json(
        { error: "Failed to load organization usage" },
        { status: 500 },
      );
    }
  },
);
