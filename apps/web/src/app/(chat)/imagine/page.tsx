import { ImagineStudioLoader } from "@/components/imagine/imagine-studio-loader";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";

export default async function ImaginePage() {
  const session = await getSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  if (!process.env.DASHSCOPE_API_KEY?.trim()) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-4 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Imagine</h1>
        <p className="text-sm text-muted-foreground">
          Image and video generation is not configured yet. Set
          DASHSCOPE_API_KEY on the server to enable Qwen image and Wan video
          models.
        </p>
      </div>
    );
  }

  return <ImagineStudioLoader />;
}
