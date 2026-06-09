import { WorkspaceSection } from "@/components/workspace/workspace-section";
import { getSession } from "auth/server";
import { notFound, redirect } from "next/navigation";

const validSections = new Set([
  "prompts",
  "memories",
  "bookmarks",
  "files",
  "skills",
]);

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const session = await getSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const { section } = await params;

  if (!validSections.has(section)) {
    notFound();
  }

  return <WorkspaceSection section={section} />;
}
