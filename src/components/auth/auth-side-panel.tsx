import { Bot, CheckCircle2, MessageSquareText, Sparkles } from "lucide-react";
import { Think } from "ui/think";

export function AuthSidePanel({ description }: { description: string }) {
  return (
    <aside className="hidden lg:flex lg:w-1/2 min-h-screen border-r bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
      <div className="relative z-10 flex w-full flex-col p-12 xl:p-16">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Think />
          </div>
          <div>
            <p className="text-lg font-semibold">Cognix</p>
            <p className="text-xs text-zinc-400">AI workspace</p>
          </div>
        </div>

        <div className="my-auto max-w-xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
            <Sparkles className="size-4" />
            Secure access for every workflow
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal xl:text-5xl">
            Start focused. Stay in flow.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-zinc-300">
            {description}
          </p>

          <div className="mt-10 grid max-w-lg gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-emerald-300/15 text-emerald-200">
                  <MessageSquareText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Chat model ready</p>
                  <p className="truncate text-xs text-zinc-400">
                    Context, tools, and agents connected
                  </p>
                </div>
                <CheckCircle2 className="ml-auto size-4 text-emerald-300" />
              </div>
            </div>

            <div className="ml-8 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Bot className="size-4 text-cyan-200" />
                  Agent pipeline
                </div>
                <span className="rounded-md bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                  live
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-12 rounded-md border border-white/10 bg-white/[0.05]"
                  >
                    <div
                      className="h-full rounded-md bg-white/10 animate-pulse"
                      style={{ animationDelay: `${item * 160}ms` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs text-zinc-400">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-zinc-100">OAuth</p>
            <p>Ready</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-zinc-100">Teams</p>
            <p>Managed</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-zinc-100">Reset</p>
            <p>Protected</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
