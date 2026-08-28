import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CityTypeForm } from "./city-type-form";
import { cityTypeSchema, emptyCityTypeFormValues, type CityTypeFormValues } from "../schema";
import { useCreateCityType, useUpdateCityType } from "../hooks";
import type { CityType } from "../types";

interface CityTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeToEdit?: CityType | null;
}

export function CityTypeDialog({ open, onOpenChange, typeToEdit }: CityTypeDialogProps) {
  const isEditing = Boolean(typeToEdit);
  const createMutation = useCreateCityType();
  const updateMutation = useUpdateCityType();

  const form = useForm<CityTypeFormValues>({
    resolver: zodResolver(cityTypeSchema),
    defaultValues: emptyCityTypeFormValues,
  });

  useEffect(() => {
    if (typeToEdit) {
      form.reset({
        code: typeToEdit.code || "",
        name: typeToEdit.name || "",
        description: typeToEdit.description || "",
        costIndex: String(typeToEdit.costIndex ?? "1.00"),
        densityLevel: (typeToEdit.densityLevel as any) || "medium",
        defaultSurgeCap: String(typeToEdit.defaultSurgeCap ?? "3.00"),
        waitingFeeEnabled: typeToEdit.waitingFeeEnabled ?? true,
        sortOrder: String(typeToEdit.sortOrder ?? "0"),
      });
    } else {
      form.reset(emptyCityTypeFormValues);
    }
  }, [typeToEdit, open, form]);

  const onSubmit = async (values: CityTypeFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      costIndex: parseFloat(values.costIndex) || 1.0,
      densityLevel: values.densityLevel,
      defaultSurgeCap: parseFloat(values.defaultSurgeCap) || 3.0,
      waitingFeeEnabled: values.waitingFeeEnabled,
      sortOrder: parseInt(values.sortOrder, 10) || 0,
    };

    if (typeToEdit) {
      await updateMutation.mutateAsync({ id: typeToEdit.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit City Type / Tier" : "Create City Type / Tier"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CityTypeForm form={form} isEditing={isEditing} />

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEditing
                ? "Update Tier"
                : "Create Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
