import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useResolveSosAlert } from "../hooks";
import type { SosAlert } from "../types";

interface ResolveSosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertToResolve?: SosAlert | null;
}

export function ResolveSosDialog({
  open,
  onOpenChange,
  alertToResolve,
}: ResolveSosDialogProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const resolveMutation = useResolveSosAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertToResolve) return;

    await resolveMutation.mutateAsync({
      id: alertToResolve.id,
      payload: { resolutionNotes },
    });
    setResolutionNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Resolve Emergency SOS Incident</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20 text-xs space-y-1">
            <p className="font-semibold text-destructive">Incident Details:</p>
            <p>Alert ID: <span className="font-mono">{alertToResolve?.id}</span></p>
            <p>Ride ID: <span className="font-mono">{alertToResolve?.rideId}</span></p>
            <p>Initiated By: <span className="font-semibold">{alertToResolve?.userType}</span></p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Action Taken / Resolution Summary</Label>
            <Textarea
              id="notes"
              required
              rows={3}
              placeholder="e.g. Contacted rider & driver, confirmed safety, local authorities notified..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
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
            <Button
              type="submit"
              variant="destructive"
              disabled={resolveMutation.isPending || !resolutionNotes.trim()}
            >
              {resolveMutation.isPending ? "Closing..." : "Close SOS Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
