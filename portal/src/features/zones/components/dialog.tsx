import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ZoneForm, { ZoneDetectForm } from "./form";
import type { ZoneFormState, ZoneDetectFormState } from "./form";
import type { Zone, Country } from "../types";

interface ZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
  countries: Country[];
  values: ZoneFormState;
  onChange: (values: ZoneFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function ZoneFormDialog({
  open,
  onOpenChange,
  zone,
  countries,
  values,
  onChange,
  onSubmit,
  isPending,
}: ZoneFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{zone ? "Edit Zone" : "Add Zone"}</DialogTitle>
          <DialogDescription>
            {zone
              ? "Update core attributes and geofenced perimeters."
              : "Register a geofenced area for local operational pricing structures."}
          </DialogDescription>
        </DialogHeader>
        <ZoneForm
          values={values}
          countries={countries}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
          submitLabel={zone ? "Save Modifications" : "Generate Zone"}
        />
      </DialogContent>
    </Dialog>
  );
}

interface ZoneDetectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: ZoneDetectFormState;
  onChange: (values: ZoneDetectFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  detectedZoneName?: string | null;
}

export function ZoneDetectDialog({
  open,
  onOpenChange,
  values,
  onChange,
  onSubmit,
  isPending,
  detectedZoneName,
}: ZoneDetectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Detect Zone</DialogTitle>
          <DialogDescription>
            Input latitude/longitude values to verify matching operational geofences.
          </DialogDescription>
        </DialogHeader>
        <ZoneDetectForm
          values={values}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
          detectedZoneName={detectedZoneName}
        />
      </DialogContent>
    </Dialog>
  );
}

