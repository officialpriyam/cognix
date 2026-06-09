export function AuthSidePanel() {
  return (
    <aside
      aria-hidden="true"
      className="hidden lg:flex lg:w-1/2 min-h-screen border-r bg-zinc-950 relative overflow-hidden"
    >
      <div className="absolute inset-0 auth-grid-motion opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),transparent_34%,rgba(34,211,238,0.1)_68%,transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-200/40 to-transparent" />

      <div className="relative z-10 flex w-full items-center justify-center p-12 xl:p-16">
        <div className="relative aspect-square w-full max-w-[560px]">
          <div className="auth-scan absolute inset-0 rounded-lg border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/30" />
          <div className="auth-ring absolute inset-10 rounded-full border border-emerald-300/25" />
          <div className="auth-ring-reverse absolute inset-24 rounded-full border border-cyan-200/20" />

          <div className="auth-panel-float absolute left-8 top-14 h-28 w-48 rounded-lg border border-white/10 bg-white/[0.055] backdrop-blur-sm" />
          <div
            className="auth-panel-float absolute right-10 top-28 h-36 w-56 rounded-lg border border-white/10 bg-white/[0.045] backdrop-blur-sm"
            style={{ animationDelay: "-1.8s" }}
          />
          <div
            className="auth-panel-float absolute bottom-14 left-20 h-32 w-60 rounded-lg border border-white/10 bg-white/[0.04] backdrop-blur-sm"
            style={{ animationDelay: "-3.2s" }}
          />

          <div className="absolute inset-0">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="auth-node absolute size-3 rounded-full border border-emerald-200/50 bg-emerald-300/30 shadow-[0_0_24px_rgba(16,185,129,0.45)]"
                style={{
                  left: `${18 + ((item * 17) % 64)}%`,
                  top: `${16 + ((item * 23) % 66)}%`,
                  animationDelay: `${item * 220}ms`,
                }}
              />
            ))}
          </div>

          <div className="auth-line absolute left-[18%] top-[26%] h-px w-[58%] rotate-12 bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />
          <div className="auth-line absolute left-[24%] top-[58%] h-px w-[52%] -rotate-12 bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
          <div className="auth-line absolute left-[34%] top-[18%] h-[64%] w-px bg-gradient-to-b from-transparent via-white/25 to-transparent" />
        </div>
      </div>
    </aside>
  );
}
