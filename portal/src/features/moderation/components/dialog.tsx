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
import { useResolveModeration } from "../hooks";
import type { ModerationItem, ModerationAction } from "../types";

interface ModerationActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ModerationItem | null;
  action?: ModerationAction | null;
}

export function ModerationActionDialog({
  open,
  onOpenChange,
  item,
  action,
}: ModerationActionDialogProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const resolveMutation = useResolveModeration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !action) return;

    await resolveMutation.mutateAsync({
      id: item.id,
      payload: {
        action,
        resolutionNotes: resolutionNotes || undefined,
      },
    });
    setResolutionNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="capitalize">Confirm {action} Action</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-1">
            <p className="font-semibold text-foreground">Flagged Item: {item?.contentType}</p>
            <p className="text-muted-foreground">"{item?.flaggedText}"</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Resolution Notes (Optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="e.g. Content violated community guidelines / false positive..."
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
              variant={action === "ban" ? "destructive" : "default"}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? "Applying..." : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
