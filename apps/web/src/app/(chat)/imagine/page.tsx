import { ImagineStudioLoader } from "@/components/imagine/imagine-studio-loader";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";

export default async function ImaginePage() {
  const session = await getSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  // No hard gate: Gemini Flash Image works via the AI Gateway by default;
  // Qwen/Wan models surface a clear error when DASHSCOPE_API_KEY is missing.
  return <ImagineStudioLoader />;
}
