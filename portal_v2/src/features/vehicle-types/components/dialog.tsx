import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VehicleTypeForm from "./form";
import type { VehicleTypeFormValues } from "../schema";

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
