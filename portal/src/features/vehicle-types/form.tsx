import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { VehicleTypeFormValues } from "./schema";

interface VehicleTypeFormProps {
  values: VehicleTypeFormValues;
  setValues: (values: VehicleTypeFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isPending: boolean;
}

// Shared form body for both Create and Edit — dialog.tsx supplies the
// title/submit label that differ between the two flows.
export default function VehicleTypeForm({
  values,
  setValues,
  onSubmit,
  onCancel,
  submitLabel,
  isPending,
}: VehicleTypeFormProps) {
  const update = <K extends keyof VehicleTypeFormValues>(
    key: K,
    value: VehicleTypeFormValues[K]
  ) => {
    setValues({ ...values, [key]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Class Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. Cab Prime"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">
            Slug ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="slug"
            placeholder="e.g. cab-prime"
            value={values.slug}
            onChange={(e) => update("slug", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (Pax)</Label>
          <Input
            id="capacity"
            type="number"
            placeholder="4"
            value={values.capacity ?? ""}
            onChange={(e) => update("capacity", Number(e.target.value) || 1)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minFare">Minimum Fare (₹)</Label>
          <Input
            id="minFare"
            placeholder="e.g. 50.00"
            value={values.minFare || ""}
            onChange={(e) => update("minFare", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="baseRate">
            Base Rate <span className="text-red-500">*</span>
          </Label>
          <Input
            id="baseRate"
            placeholder="30.00"
            value={values.baseRate}
            onChange={(e) => update("baseRate", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perKmRate">
            Per KM Rate <span className="text-red-500">*</span>
          </Label>
          <Input
            id="perKmRate"
            placeholder="12.00"
            value={values.perKmRate}
            onChange={(e) => update("perKmRate", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perMinRate">Per Min Rate</Label>
          <Input
            id="perMinRate"
            placeholder="1.50"
            value={values.perMinRate || ""}
            onChange={(e) => update("perMinRate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 items-center pt-2">
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Priority Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            value={values.sortOrder ?? 0}
            onChange={(e) => update("sortOrder", Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-center gap-2 self-end h-10">
          <input
            id="isActive"
            type="checkbox"
            checked={values.isActive ?? true}
            onChange={(e) => update("isActive", e.target.checked)}
            className="h-4 w-4 accent-primary rounded border-border cursor-pointer"
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Active dispatch class
          </Label>
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
          disabled={isPending}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}