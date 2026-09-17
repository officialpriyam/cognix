"use client";

import { useState } from "react";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { DropdownMenuItem } from "ui/dropdown-menu";
import { Receipt } from "lucide-react";

/**
 * Cognix has no paid tiers: every feature ships on the free plan, so there is
 * no billing portal to link to. This states that plainly instead of linking
 * nowhere.
 */
export function FreeBillingMenuItem() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenuItem
        className="cursor-pointer"
        onClick={() => setOpen(true)}
        data-testid="manage-billing-menu-item"
      >
        <Receipt className="size-4 text-foreground" />
        <span>Manage Billing</span>
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cognix is fully free</DialogTitle>
            <DialogDescription>
              Every model, tool, workflow, and workspace feature is included. No
              plans, no bills, no checkout.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>We are free Chill!!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
