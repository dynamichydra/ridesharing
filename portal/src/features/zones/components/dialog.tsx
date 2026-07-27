import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ZoneForm, { ZoneDetectForm, GenerateHexForm } from "./form";
import type { ZoneFormState, ZoneDetectFormState, GenerateHexFormState } from "./form";
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
  contextZones?: Zone[];
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
  contextZones,
}: ZoneFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-160 max-h-[90vh] overflow-y-auto">
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
          contextZones={contextZones}
          hexCells={zone?.hexCells}
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
  hexMatches?: Zone[];
  contextZones?: Zone[];
}

export function ZoneDetectDialog({
  open,
  onOpenChange,
  values,
  onChange,
  onSubmit,
  isPending,
  detectedZoneName,
  hexMatches,
  contextZones,
}: ZoneDetectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detect Zone</DialogTitle>
          <DialogDescription>
            Click a point on the map (or type coordinates) to check matching operational geofences and H3 hex zones.
          </DialogDescription>
        </DialogHeader>
        <ZoneDetectForm
          values={values}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
          detectedZoneName={detectedZoneName}
          hexMatches={hexMatches}
          contextZones={contextZones}
        />
      </DialogContent>
    </Dialog>
  );
}

interface GenerateHexDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
  values: GenerateHexFormState;
  onChange: (values: GenerateHexFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function GenerateHexDialog({
  open,
  onOpenChange,
  zone,
  values,
  onChange,
  onSubmit,
  isPending,
}: GenerateHexDialogProps) {
  if (!zone) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Generate Hex Cells — {zone.name}</DialogTitle>
          <DialogDescription>
            Derives H3 hex cells from this zone's stored polygon at the chosen resolution.
          </DialogDescription>
        </DialogHeader>
        <GenerateHexForm
          zone={zone}
          values={values}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

