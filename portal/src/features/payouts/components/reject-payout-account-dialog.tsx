import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVerifyPayoutAccount } from "../hooks";
import type { PayoutAccount } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PayoutAccount | null;
}

export function RejectPayoutAccountDialog({ open, onOpenChange, account }: Props) {
  const verifyMutation = useVerifyPayoutAccount();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !reason.trim()) return;
    verifyMutation.mutate(
      { id: account.id, payload: { approve: false, rejectionReason: reason.trim() } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Reject Payout Account</DialogTitle>
          <DialogDescription>
            Tell the driver what's wrong with their payout account so they know what to fix.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pa-reject-reason">Rejection Reason</Label>
            <Textarea
              id="pa-reject-reason"
              placeholder="e.g. Bank details mismatch, identity verification incomplete"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={verifyMutation.isPending || !reason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
