export function AuthSidePanel() {
  return (
    <aside
      aria-hidden="true"
      className="hidden lg:flex lg:w-1/2 min-h-screen border-r bg-zinc-950 relative overflow-hidden"
    >
      <div className="absolute inset-0 auth-preview-grid opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_28%,rgba(20,184,166,0.10)_68%,transparent)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(0deg,rgba(20,184,166,0.14),transparent)]" />

      <div className="relative flex flex-1 items-center justify-center p-12">
        <div className="auth-preview-shell auth-preview-sweep relative h-[34rem] w-[35rem] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex h-full gap-4 rounded-xl border border-white/10 bg-zinc-950/70 p-3">
            <div className="flex w-14 shrink-0 flex-col items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] py-4">
              <span className="size-7 rounded-md bg-emerald-300/80" />
              <span className="size-8 rounded-md bg-white/10" />
              <span className="size-8 rounded-md bg-white/10" />
              <span className="size-8 rounded-md bg-white/10" />
              <span className="mt-auto size-8 rounded-full bg-white/10" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2">
                <span className="h-3 w-28 rounded-full bg-white/[0.18]" />
                <span className="ml-auto size-7 rounded-md bg-white/10" />
                <span className="size-7 rounded-md bg-white/10" />
              </div>

              <div className="grid flex-1 grid-cols-[1fr_0.8fr] gap-3">
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="size-8 rounded-full bg-teal-300/70" />
                      <span className="h-3 w-32 rounded-full bg-white/20" />
                    </div>
                    <div className="space-y-2">
                      <span className="auth-preview-row block h-3 w-full rounded-full bg-white/10" />
                      <span className="auth-preview-row block h-3 w-10/12 rounded-full bg-white/10 [animation-delay:-1.2s]" />
                      <span className="auth-preview-row block h-3 w-8/12 rounded-full bg-white/10 [animation-delay:-2.1s]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                      <span className="mb-5 block size-9 rounded-lg bg-white/10" />
                      <span className="block h-3 w-20 rounded-full bg-white/20" />
                      <span className="mt-2 block h-2 w-28 rounded-full bg-white/10" />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                      <span className="mb-5 block size-9 rounded-lg bg-emerald-300/60" />
                      <span className="block h-3 w-24 rounded-full bg-white/20" />
                      <span className="mt-2 block h-2 w-20 rounded-full bg-white/10" />
                    </div>
                  </div>

                  <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-40 rounded-full bg-white/20" />
                      <span className="auth-preview-cursor h-4 w-px bg-emerald-200" />
                      <span className="ml-auto size-9 rounded-full bg-emerald-300/80" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <span className="mb-4 block h-3 w-24 rounded-full bg-white/20" />
                    <div className="space-y-3">
                      {[72, 56, 84, 48].map((width, index) => (
                        <span
                          key={width}
                          className="block h-8 rounded-md bg-white/10"
                          style={{
                            width: `${width}%`,
                            marginLeft: index % 2 ? "auto" : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <span className="h-20 rounded-xl border border-white/10 bg-white/[0.04]" />
                    <span className="h-20 rounded-xl border border-white/10 bg-white/[0.04]" />
                  </div>

                  <div className="flex flex-1 flex-col justify-end rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <span className="mb-3 block h-3 w-20 rounded-full bg-white/20" />
                    <div className="space-y-2">
                      <span className="block h-2 w-full rounded-full bg-emerald-300/60" />
                      <span className="block h-2 w-9/12 rounded-full bg-white/[0.12]" />
                      <span className="block h-2 w-7/12 rounded-full bg-white/[0.12]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
