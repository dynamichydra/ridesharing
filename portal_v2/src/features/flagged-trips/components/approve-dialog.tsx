import { useEffect, useState } from "react";
import { Check } from "lucide-react";
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
import { useApproveFlaggedTrip } from "../hooks";
import type { FlaggedTrip } from "../types";

function formatMinor(amountMinor: number, currencyCode: string | null): string {
  if (!currencyCode) return String(amountMinor / 100);
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: FlaggedTrip | null;
}

export function ApproveFlaggedTripDialog({ open, onOpenChange, trip }: Props) {
  const approveMutation = useApproveFlaggedTrip();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    approveMutation.mutate(
      { id: trip.id, payload: { note: note.trim() || undefined } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" /> Approve Fare Deviation
          </DialogTitle>
          <DialogDescription>
            {trip &&
              `Bills the GPS-recomputed actual fare of ${formatMinor(trip.actualFareMinor, trip.currencyCode)} (estimate was ${formatMinor(trip.estimatedFareMinor, trip.currencyCode)}).`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ft-approve-note">Note (Optional)</Label>
            <Textarea
              id="ft-approve-note"
              placeholder="e.g. Confirmed genuine detour via GPS trace"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              Approve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
