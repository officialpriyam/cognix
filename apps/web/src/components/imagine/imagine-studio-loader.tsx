"use client";

import dynamic from "next/dynamic";

const ImagineStudio = dynamic(
  () =>
    import("@/components/imagine/imagine-studio").then(
      (mod) => mod.ImagineStudio,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-muted-foreground">
        Loading Imagine…
      </div>
    ),
  },
);

export function ImagineStudioLoader() {
  return <ImagineStudio />;
}
