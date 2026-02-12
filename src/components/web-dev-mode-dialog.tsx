"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Textarea } from "ui/textarea";
import { CopyIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_BRIEF =
  "Build a responsive website with a hero section, feature cards, pricing, and contact form.";

const STACKBLITZ_EDITOR_URL =
  "https://stackblitz.com/edit/react-ts?embed=1&file=src/App.tsx&terminal=dev&view=editor";

export function WebDevModeDialog({
  open,
  onOpenChange,
  initialPrompt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
}) {
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    const trimmed = initialPrompt?.trim();
    if (trimmed) {
      setBrief(trimmed);
    }
  }, [open, initialPrompt]);

  const stackblitzUrl = useMemo(() => {
    const title = encodeURIComponent("Cognix Web Dev Mode");
    return `${STACKBLITZ_EDITOR_URL}&title=${title}&key=${refreshKey}`;
  }, [refreshKey]);

  const boltUrl = useMemo(() => {
    const prompt = encodeURIComponent(brief || DEFAULT_BRIEF);
    return `https://bolt.new/?prompt=${prompt}`;
  }, [brief]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] h-[94vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Web Dev Mode</DialogTitle>
          <DialogDescription>
            Use StackBlitz as an in-app web app builder workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-3 flex flex-col gap-3">
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className="min-h-20 resize-none"
            placeholder={DEFAULT_BRIEF}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(brief || DEFAULT_BRIEF);
                  toast.success("Project brief copied");
                } catch {
                  toast.error("Unable to copy brief");
                }
              }}
            >
              <CopyIcon className="size-4" />
              Copy brief
            </Button>
            <Button
              variant="secondary"
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              <RefreshCwIcon className="size-4" />
              Reload container
            </Button>
            <Button asChild variant="secondary">
              <a href={STACKBLITZ_EDITOR_URL} target="_blank" rel="noreferrer">
                <ExternalLinkIcon className="size-4" />
                Open StackBlitz
              </a>
            </Button>
            <Button asChild>
              <a href={boltUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon className="size-4" />
                Open in Bolt.new
              </a>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 border-t">
          <iframe
            key={stackblitzUrl}
            src={stackblitzUrl}
            title="StackBlitz Web Dev Container"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; microphone; midi; camera"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
