import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { VehicleTypeFormValues } from "../schema";

interface VehicleTypeFormProps {
  mode: "create" | "edit";
  values: VehicleTypeFormValues;
  setValues: (values: VehicleTypeFormValues) => void;
  errors: Partial<Record<keyof VehicleTypeFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isPending: boolean;
}


export default function VehicleTypeForm({
  mode,
  values,
  setValues,
  errors,
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
      {mode === "create" && (
        <div className="space-y-2">
          <Label htmlFor="name">
            Vehicle Type Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. Cab Prime"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">
            Capacity <span className="text-red-500">*</span>
          </Label>
          <Input
            id="capacity"
            type="number"
            placeholder="4"
            value={values.capacity}
            onChange={(e) =>
              update("capacity", e.target.value === "" ? "" : Number(e.target.value))
            }
            required
          />
          {errors.capacity && <p className="text-xs text-destructive">{errors.capacity}</p>}
        </div>

        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="sortOrder">
              Sort Order <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sortOrder"
              type="number"
              placeholder="1"
              value={values.sortOrder}
              onChange={(e) =>
                update("sortOrder", e.target.value === "" ? "" : Number(e.target.value))
              }
              required
            />
            {errors.sortOrder && <p className="text-xs text-destructive">{errors.sortOrder}</p>}
          </div>
        )}

        {mode === "edit" && (
          <div className="flex items-center gap-2 self-end h-10">
            <input
              id="isActive"
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-border cursor-pointer"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active dispatch class
            </Label>
          </div>
        )}
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
