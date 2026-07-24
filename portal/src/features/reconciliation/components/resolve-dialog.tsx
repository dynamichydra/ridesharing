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
import { useResolveMismatch } from "../hooks";
import type { Mismatch } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mismatch: Mismatch | null;
  // Which action opened the dialog — determines the submitted status and button styling.
  intent: "resolved" | "ignored" | null;
}

export function ResolveMismatchDialog({ open, onOpenChange, mismatch, intent }: Props) {
  const resolveMutation = useResolveMismatch();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes("");
  }, [open]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mismatch || !intent) return;
    resolveMutation.mutate(
      { id: mismatch.id, payload: { status: intent, notes: notes.trim() || undefined } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const isResolve = intent === "resolved";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isResolve ? "Resolve Mismatch" : "Ignore Mismatch"}</DialogTitle>
          <DialogDescription>
            {isResolve
              ? "Marks this finding as reviewed and accounted for. This never changes any payment/ledger row automatically — fix those manually first if needed."
              : "Marks this finding as a known, acceptable discrepancy (e.g. test data, expected timing gap)."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rm-notes">Notes (Optional)</Label>
            <Textarea
              id="rm-notes"
              placeholder="What did you find / why is this okay to close?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={resolveMutation.isPending}
              className={isResolve ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer" : "cursor-pointer"}
              variant={isResolve ? "default" : "outline"}
            >
              {isResolve ? "Mark Resolved" : "Mark Ignored"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
