import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PauseCircle, PlayCircle, Ban } from "lucide-react";
import type { DriverSubscriber } from "../types";

export type SubscriberActionType = "pause" | "resume" | "cancel";

interface SubscriberActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriber: DriverSubscriber | null;
  actionType: SubscriberActionType | null;
  isLoading: boolean;
  onConfirm: (reason?: string) => void;
}

export function SubscriberActionDialog({
  open,
  onOpenChange,
  subscriber,
  actionType,
  isLoading,
  onConfirm,
}: SubscriberActionDialogProps) {
  const [reason, setReason] = useState("");

  if (!subscriber || !actionType) return null;

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason("");
  };

  const isPause = actionType === "pause";
  const isResume = actionType === "resume";
  const isCancel = actionType === "cancel";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPause && <PauseCircle className="h-5 w-5 text-amber-500" />}
            {isResume && <PlayCircle className="h-5 w-5 text-emerald-500" />}
            {isCancel && <Ban className="h-5 w-5 text-rose-500" />}
            <span className="capitalize">{actionType} Subscription</span>
          </DialogTitle>
          <DialogDescription>
            {isPause &&
              `Are you sure you want to pause ${subscriber.driver?.name || "this driver"}'s subscription? Their plan perks will be temporarily frozen.`}
            {isResume &&
              `Are you sure you want to resume ${subscriber.driver?.name || "this driver"}'s subscription? Perks and entitlements will become active immediately.`}
            {isCancel &&
              `Are you sure you want to cancel ${subscriber.driver?.name || "this driver"}'s subscription? This will revoke active commercial entitlements.`}
          </DialogDescription>
        </DialogHeader>

        {(isPause || isCancel) && (
          <div className="space-y-2 py-2">
            <Label htmlFor="action-reason" className="text-xs">
              Reason / Admin Note (Optional)
            </Label>
            <Textarea
              id="action-reason"
              placeholder={
                isPause
                  ? "e.g. Driver medical leave, seasonal break..."
                  : "e.g. Non-payment, driver requested cancellation..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none text-xs"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isCancel ? "destructive" : isPause ? "default" : "default"}
            className={isResume ? "bg-emerald-600 hover:bg-emerald-700 text-white" : isPause ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : `Confirm ${actionType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
