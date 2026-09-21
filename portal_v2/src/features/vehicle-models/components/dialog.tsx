import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { vehicleModelFormSchema, emptyVehicleModelFormValues, type VehicleModelFormValues } from "../schema";
import { VehicleModelForm } from "./form";
import { useCreateVehicleModel, useUpdateVehicleModel } from "../hooks";
import type { VehicleModel } from "../types";

interface VehicleModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleModel?: VehicleModel | null;
  onSuccess?: () => void;
}

// Create-or-edit dialog (same shape as users' RiderFormDialog) — `vehicleModel` present means edit.
export function VehicleModelFormDialog({ open, onOpenChange, vehicleModel, onSuccess }: VehicleModelFormDialogProps) {
  const createMutation = useCreateVehicleModel();
  const updateMutation = useUpdateVehicleModel();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<VehicleModelFormValues>({
    resolver: zodResolver(vehicleModelFormSchema),
    defaultValues: emptyVehicleModelFormValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      vehicleModel
        ? {
            vehicleTypeId: vehicleModel.vehicleTypeId,
            brand: vehicleModel.brand,
            name: vehicleModel.name,
            sortOrder: vehicleModel.sortOrder,
          }
        : emptyVehicleModelFormValues,
    );
  }, [open, vehicleModel, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (vehicleModel) {
      updateMutation.mutate(
        { id: vehicleModel.id, payload: values },
        { onSuccess: () => { onOpenChange(false); onSuccess?.(); } },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => { onOpenChange(false); onSuccess?.(); },
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{vehicleModel ? "Edit Vehicle Model" : "Add Vehicle Model"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <VehicleModelForm form={form} />
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
              disabled={isPending}
            >
              {vehicleModel ? "Save Changes" : "Create Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
