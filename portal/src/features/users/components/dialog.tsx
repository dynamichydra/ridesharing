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
import { riderSchema, emptyRiderFormValues, type RiderFormValues } from "../schema";
import { RiderForm } from "./form";
import { useCreateRider, useUpdateRider } from "../hooks";
import type { Rider } from "../types";

interface RiderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider?: Rider | null;
  onSuccess?: () => void;
}

// Create-or-edit dialog (same shape as geo's CountryFormDialog) — `rider` present means edit.
export function RiderFormDialog({ open, onOpenChange, rider, onSuccess }: RiderFormDialogProps) {
  const createMutation = useCreateRider();
  const updateMutation = useUpdateRider();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<RiderFormValues>({
    resolver: zodResolver(riderSchema),
    defaultValues: emptyRiderFormValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      rider
        ? {
            name: rider.name || "",
            phone: rider.phone,
            email: rider.email || "",
            isVerified: rider.isVerified,
            countryId: rider.countryId || "",
            stateId: rider.stateId || "",
            cityId: rider.cityId || "",
          }
        : emptyRiderFormValues,
    );
  }, [open, rider, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      isVerified: values.isVerified,
      countryId: values.countryId || undefined,
      stateId: values.stateId || undefined,
      cityId: values.cityId || undefined,
    };

    if (rider) {
      updateMutation.mutate(
        { id: rider.id, payload },
        { onSuccess: () => { onOpenChange(false); onSuccess?.(); } },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { onOpenChange(false); onSuccess?.(); },
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{rider ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <RiderForm form={form} />
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
              {rider ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}