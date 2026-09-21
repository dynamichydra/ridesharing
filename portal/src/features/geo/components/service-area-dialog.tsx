import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ServiceAreaForm } from "./service-area-form";
import { serviceAreaSchema, emptyServiceAreaFormValues, type ServiceAreaFormValues } from "../schema";
import { useCreateServiceArea, useUpdateServiceArea } from "../hooks";
import { parseGeoJSONPolygonInput } from "../utils";
import type { CityServiceArea, City } from "../types";

interface ServiceAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaToEdit?: CityServiceArea | null;
  cities: City[];
}

export function ServiceAreaDialog({
  open,
  onOpenChange,
  areaToEdit,
  cities,
}: ServiceAreaDialogProps) {
  const isEditing = Boolean(areaToEdit);
  const createMutation = useCreateServiceArea();
  const updateMutation = useUpdateServiceArea();

  const form = useForm<ServiceAreaFormValues>({
    resolver: zodResolver(serviceAreaSchema),
    defaultValues: emptyServiceAreaFormValues,
  });

  useEffect(() => {
    if (areaToEdit) {
      form.reset({
        cityId: areaToEdit.cityId || "",
        name: areaToEdit.name || "",
        status: areaToEdit.status || "ACTIVE",
        polygon: areaToEdit.polygon ? JSON.stringify(areaToEdit.polygon, null, 2) : "",
        resolution: String(areaToEdit.resolution ?? "9"),
      });
    } else {
      form.reset(emptyServiceAreaFormValues);
    }
  }, [areaToEdit, open, form]);

  const onSubmit = async (values: ServiceAreaFormValues) => {
    const { polygon, error } = parseGeoJSONPolygonInput(values.polygon);
    if (error || !polygon) {
      toast.error(error || "Please enter a valid GeoJSON polygon");
      return;
    }

    const payload = {
      cityId: values.cityId,
      name: values.name,
      status: values.status,
      polygon,
      resolution: values.resolution ? parseInt(values.resolution, 10) : 9,
    };

    if (areaToEdit) {
      await updateMutation.mutateAsync({ id: areaToEdit.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b border-border/40">
          <DialogTitle>{isEditing ? "Edit Service Area" : "Create Service Area Boundary"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-3">
            <ServiceAreaForm form={form} cities={cities} isEditing={isEditing} />
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending
                ? "Saving..."
                : isEditing
                ? "Update Area"
                : "Create Area"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
