import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ZoneForm from "./form";
import type { Zone } from "./types";


//Create / Edit dialog — wraps the self-contained ZoneForm 


interface ZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
  onSuccess: () => void;
}

export function ZoneFormDialog({ open, onOpenChange, zone, onSuccess }: ZoneFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{zone ? "Edit Zone" : "Create Zone"}</DialogTitle>
          <DialogDescription>
            {zone
              ? "Update the boundary, multiplier, or status for this pricing zone."
              : "Define a new geofenced pricing zone (city centre, airport, etc)."}
          </DialogDescription>
        </DialogHeader>
        <ZoneForm initialData={zone} onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}


//Delete confirmation dialog       


interface DeleteZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteZoneDialog({
  open,
  onOpenChange,
  zone,
  onConfirm,
  isPending,
}: DeleteZoneDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Zone</DialogTitle>
          <DialogDescription>
            This will permanently remove{" "}
            <span className="font-semibold text-foreground">{zone?.name}</span>. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            disabled={isPending}
          >
            Delete Zone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}