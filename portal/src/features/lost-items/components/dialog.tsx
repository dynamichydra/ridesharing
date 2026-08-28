import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateLostItemStatus } from "../hooks";
import type { LostItem, LostItemStatus } from "../types";

interface LostItemStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: LostItem | null;
}

export function LostItemStatusDialog({
  open,
  onOpenChange,
  item,
}: LostItemStatusDialogProps) {
  const [status, setStatus] = useState<LostItemStatus>("open");
  const [notes, setNotes] = useState("");

  const updateMutation = useUpdateLostItemStatus();

  useEffect(() => {
    if (item) {
      setStatus(item.status || "open");
      setNotes(item.resolutionNotes || "");
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    await updateMutation.mutateAsync({
      id: item.id,
      payload: {
        status,
        resolutionNotes: notes || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Update Lost Item Investigation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-1">
            <p className="font-semibold">{item?.itemCategory} ({item?.reporterRole})</p>
            <p className="text-muted-foreground">{item?.description}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Investigation Status</Label>
            <Select
              value={status}
              onValueChange={(val: LostItemStatus) => setStatus(val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open (Reported)</SelectItem>
                <SelectItem value="driver_contacted">Driver Contacted</SelectItem>
                <SelectItem value="item_found">Item Found in Cab</SelectItem>
                <SelectItem value="returning">Returning to Passenger</SelectItem>
                <SelectItem value="returned">Returned to Owner</SelectItem>
                <SelectItem value="closed">Closed / Unrecoverable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Progress / Resolution Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="e.g. Driver confirmed item under back seat, handover arranged..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Save Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
