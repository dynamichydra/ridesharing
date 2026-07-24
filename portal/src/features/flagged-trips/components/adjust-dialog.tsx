import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAdjustFlaggedTrip } from "../hooks";
import type { FlaggedTrip } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: FlaggedTrip | null;
}

export function AdjustFlaggedTripDialog({ open, onOpenChange, trip }: Props) {
  const adjustMutation = useAdjustFlaggedTrip();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(trip ? (trip.actualFareMinor / 100).toFixed(2) : "");
      setNote("");
    }
  }, [open, trip]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adjustedFareMinor = Math.round(Number(amount) * 100);
    if (!trip || !adjustedFareMinor || adjustedFareMinor <= 0) return;
    adjustMutation.mutate(
      { id: trip.id, payload: { adjustedFareMinor, note: note.trim() || undefined } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Adjust Final Fare
          </DialogTitle>
          <DialogDescription>
            Bills this manually-set amount instead of either the estimate or the GPS-recomputed
            actual fare — e.g. splitting the difference or a goodwill adjustment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ft-adjust-amount">Adjusted Fare</Label>
            <Input
              id="ft-adjust-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ft-adjust-note">Note (Optional)</Label>
            <Textarea
              id="ft-adjust-note"
              placeholder="e.g. Split the difference with the rider as goodwill"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={adjustMutation.isPending} className="cursor-pointer">
              Bill Adjusted Fare
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
