import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VehicleTypeForm from "./form";
import type { VehicleTypeFormValues } from "../schema";
import type { VehicleType } from "../types";


//Create / Edit dialog — same form, different fields/copy by mode     


interface VehicleTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  values: VehicleTypeFormValues;
  setValues: (values: VehicleTypeFormValues) => void;
  errors: Partial<Record<keyof VehicleTypeFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function VehicleTypeFormDialog({
  open,
  onOpenChange,
  mode,
  values,
  setValues,
  errors,
  onSubmit,
  isPending,
}: VehicleTypeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Vehicle Type" : "Update Vehicle Type"}</DialogTitle>
        </DialogHeader>
        <VehicleTypeForm
          mode={mode}
          values={values}
          setValues={setValues}
          errors={errors}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={mode === "create" ? "Create Vehicle Type" : "Save Changes"}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}


// Delete confirmation dialog 


interface DeleteVehicleTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleType: VehicleType | null;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteVehicleTypeDialog({
  open,
  onOpenChange,
  vehicleType,
  onConfirm,
  isPending,
}: DeleteVehicleTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Vehicle Type</DialogTitle>
          <DialogDescription>
            This will permanently remove{" "}
            <span className="font-semibold text-foreground">{vehicleType?.name}</span>. This
            action cannot be undone.
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
            Delete Vehicle Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
