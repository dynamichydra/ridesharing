import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGenerateCorporateInvoice } from "../hooks";
import type { CorporateAccount } from "../types";

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: CorporateAccount | null;
}

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  account,
}: GenerateInvoiceDialogProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const invoiceMutation = useGenerateCorporateInvoice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    await invoiceMutation.mutateAsync({
      accountId: account.id,
      payload: {
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      },
    });
    setPeriodStart("");
    setPeriodEnd("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Generate Monthly Billing Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-1">
            <p className="font-semibold">{account?.name}</p>
            <p className="text-muted-foreground">Current Exposure to Bill: ₹{((account?.currentExposureMinor || 0) / 100).toLocaleString("en-IN")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pstart">Billing Period Start</Label>
            <Input
              id="pstart"
              type="date"
              required
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pend">Billing Period End</Label>
            <Input
              id="pend"
              type="date"
              required
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={invoiceMutation.isPending}>
              {invoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
