import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTriggerInstantPayout } from "../hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-filled when triggered from an approved payout account row; blank when opened from the
  // header action, where an admin types the driver ID in by hand.
  driverId?: string;
}

export function InstantPayoutDialog({ open, onOpenChange, driverId: initialDriverId }: Props) {
  const triggerMutation = useTriggerInstantPayout();
  const [driverId, setDriverId] = useState(initialDriverId ?? "");

  useEffect(() => {
    if (open) setDriverId(initialDriverId ?? "");
  }, [open, initialDriverId]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId.trim()) return;
    triggerMutation.mutate({ driverId: driverId.trim() }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Trigger Instant Payout
          </DialogTitle>
          <DialogDescription>
            Pays out this driver's entire current wallet balance immediately, ahead of the
            scheduled weekly batch. Requires an approved payout account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ip-driver-id">Driver ID</Label>
            <Input
              id="ip-driver-id"
              placeholder="Driver UUID"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={!!initialDriverId}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={triggerMutation.isPending} className="cursor-pointer">
              {triggerMutation.isPending ? "Processing…" : "Pay Out Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
