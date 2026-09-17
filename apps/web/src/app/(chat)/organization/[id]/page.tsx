import { OrgManagePage } from "@/components/organization/org-manage-page";
import { getSession } from "auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { MemberTable, OrganizationTable } from "lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const [organization] = await pgDb
    .select({
      id: OrganizationTable.id,
      name: OrganizationTable.name,
      slug: OrganizationTable.slug,
    })
    .from(OrganizationTable)
    .where(eq(OrganizationTable.id, id));
  if (!organization) {
    notFound();
  }

  const [membership] = await pgDb
    .select({ role: MemberTable.role })
    .from(MemberTable)
    .where(
      and(
        eq(MemberTable.organizationId, id),
        eq(MemberTable.userId, session.user.id),
      ),
    );
  if (!membership) {
    notFound();
  }

  return (
    <OrgManagePage
      organizationId={organization.id}
      initialName={organization.name}
      slug={organization.slug}
      isManager={membership.role === "owner" || membership.role === "admin"}
    />
  );
}
