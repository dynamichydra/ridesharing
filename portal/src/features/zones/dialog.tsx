import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoneForm } from "./form";
import type { ZoneFormValues } from "./schema";
import type { Zone } from "./types";

const FORM_ID = "zone-form";

interface ZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedZone: Zone | null;
  defaultValues: ZoneFormValues;
  isSaving: boolean;
  onSubmit: (values: ZoneFormValues) => void;
}

// All dialogs for the Zones feature live here as separate named exports.
export function ZoneFormDialog({
  open,
  onOpenChange,
  selectedZone,
  defaultValues,
  isSaving,
  onSubmit,
}: ZoneFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {selectedZone ? "Modify Geofence Parameters" : "Create Geofence Zone"}
          </DialogTitle>
        </DialogHeader>

        <ZoneForm formId={FORM_ID} defaultValues={defaultValues} onSubmit={onSubmit} />

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
            disabled={isSaving}
          >
            Save Boundary Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ZoneDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function ZoneDeleteDialog({
  open,
  onOpenChange,
  zone,
  isDeleting,
  onConfirm,
}: ZoneDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Zone Geofence</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{zone?.name}</span>? This cannot be
          undone.
        </p>
        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            Delete Zone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}