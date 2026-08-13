"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { approveAppAuth } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Monitor } from "lucide-react";

export default function AppAuthClient() {
  const searchParams = useSearchParams();
  const state = searchParams.get("state") || "";
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      await approveAppAuth(state);
    });
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
      <Card className="w-full md:max-w-md bg-card/95 border mx-auto rounded-lg shadow-xl shadow-black/5 animate-in fade-in duration-700">
        <CardHeader className="my-4 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Monitor className="size-5" />
          </div>
          <CardTitle className="text-2xl my-1">
            Authorize Desktop App
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Cognix Desktop is requesting access to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col pb-2">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              <p>
                This will allow the Cognix Desktop app to access your chat
                history, agents, workflows, and settings.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleApprove}
              disabled={isPending || !state}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {isPending ? "Authorizing..." : "Authorize"}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.history.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
