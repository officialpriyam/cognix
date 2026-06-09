import { AuthSidePanel } from "@/components/auth/auth-side-panel";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.Intro");
  return (
    <main className="relative w-full min-h-screen bg-background">
      <div className="flex min-h-screen w-full">
        <AuthSidePanel description={t("description")} />
        <div className="w-full lg:w-1/2 p-4 sm:p-6">{children}</div>
      </div>
    </main>
  );
}
