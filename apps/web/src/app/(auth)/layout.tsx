import { Think } from "ui/think";
import { getTranslations } from "next-intl/server";
import { FlipWords } from "ui/flip-words";
import { BackgroundPaths } from "ui/background-paths";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.Intro");
  return (
    <main className="relative w-full flex flex-col h-screen">
      <div className="flex-1">
        <div className="flex min-h-screen w-full">
          <div className="hidden lg:flex lg:w-1/2 bg-muted border-r flex-col p-6 relative">
            <div className="relative flex-1 overflow-hidden rounded-3xl border bg-background shadow-2xl">
              <div className="absolute inset-0 w-full h-full">
                <BackgroundPaths />
              </div>
              <div className="relative flex h-full flex-col p-10">
                <h1 className="text-xl font-semibold flex items-center gap-3 animate-in fade-in duration-1000">
                  <Think />

                  <span>cognix</span>
                </h1>
                <div className="flex-1" />
                <FlipWords
                  words={[t("description")]}
                  className=" mb-4 text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
