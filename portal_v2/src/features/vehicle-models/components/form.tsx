import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useVehicleTypeOptions } from "../hooks";
import type { VehicleModelFormValues } from "../schema";

interface VehicleModelFormProps {
  form: UseFormReturn<VehicleModelFormValues>;
}

export function VehicleModelForm({ form }: VehicleModelFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const vehicleTypes = vehicleTypesData?.MESSAGE ?? [];

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="vm-vehicleTypeId">Vehicle Type</Label>
        <Controller<VehicleModelFormValues, "vehicleTypeId">
          name="vehicleTypeId"
          control={control}
          render={({ field }) => (
            <NativeSelect id="vm-vehicleTypeId" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
              <NativeSelectOption value="">Select vehicle type</NativeSelectOption>
              {vehicleTypes.map((vt) => (
                <NativeSelectOption key={vt.id} value={vt.id}>
                  {vt.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        />
        {errors.vehicleTypeId && (
          <p className="text-xs text-destructive">{errors.vehicleTypeId.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Drivers pick a model, not a type — this mapping is what decides their category, so a base
          vehicle can't be registered under a premium type.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vm-brand">Brand</Label>
          <Input id="vm-brand" placeholder="e.g. Honda" {...register("brand")} />
          {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vm-name">Model</Label>
          <Input id="vm-name" placeholder="e.g. Splendor" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vm-sortOrder">Sort Order</Label>
        <Input id="vm-sortOrder" type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} />
        {errors.sortOrder?.message && <p className="text-xs text-destructive">{errors.sortOrder.message}</p>}
      </div>
    </div>
  );
}
