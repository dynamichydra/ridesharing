import { useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";
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
import { useUpdateDisputeNotes } from "../hooks";
import type { Dispute } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: Dispute | null;
}

export function DisputeNotesDialog({ open, onOpenChange, dispute }: Props) {
  const updateMutation = useUpdateDisputeNotes();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes(dispute?.adminNotes ?? "");
  }, [open, dispute]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispute) return;
    updateMutation.mutate(
      { id: dispute.id, payload: { adminNotes: notes.trim() } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-primary" /> Dispute Triage Notes
          </DialogTitle>
          <DialogDescription>
            Internal notes only — this never gets sent back to the payment gateway. Accepting or
            contesting a dispute happens directly with the processor, outside this admin panel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dp-notes">Notes</Label>
            <Textarea
              id="dp-notes"
              placeholder="e.g. Evidence submitted via Stripe dashboard on..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="cursor-pointer">
              Save Notes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
