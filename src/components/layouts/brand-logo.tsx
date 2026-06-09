import { cn } from "lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 overflow-hidden rounded-md border bg-background",
        className,
      )}
    >
      <img
        src="/favicon.ico"
        alt=""
        aria-hidden="true"
        className="size-full object-cover"
      />
    </span>
  );
}
