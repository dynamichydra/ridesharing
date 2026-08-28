import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { CityTypeFormValues } from "../schema";

interface CityTypeFormProps {
  form: UseFormReturn<CityTypeFormValues>;
  isEditing?: boolean;
}

export function CityTypeForm({ form, isEditing }: CityTypeFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ct-code">Tier Code</Label>
          <Input
            id="ct-code"
            placeholder="e.g. TIER_1_METRO"
            disabled={isEditing}
            {...register("code")}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ct-name">Name</Label>
          <Input id="ct-name" placeholder="e.g. Tier-1 Metro / High Cost" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ct-desc">Description (Optional)</Label>
        <Textarea
          id="ct-desc"
          rows={2}
          placeholder="e.g. High population density cities with peak traffic conditions"
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ct-density">Density Level</Label>
          <NativeSelect id="ct-density" {...register("densityLevel")}>
            <NativeSelectOption value="high">High Density</NativeSelectOption>
            <NativeSelectOption value="medium">Medium Density</NativeSelectOption>
            <NativeSelectOption value="low">Low Density</NativeSelectOption>
            <NativeSelectOption value="rural">Rural</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ct-costIndex">Cost Index Multiplier</Label>
          <Input
            id="ct-costIndex"
            step="0.05"
            placeholder="e.g. 1.00"
            {...register("costIndex")}
          />
          {errors.costIndex && (
            <p className="text-xs text-destructive">{errors.costIndex.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ct-surgeCap">Max Surge Cap</Label>
          <Input
            id="ct-surgeCap"
            step="0.1"
            placeholder="e.g. 3.00"
            {...register("defaultSurgeCap")}
          />
          {errors.defaultSurgeCap && (
            <p className="text-xs text-destructive">{errors.defaultSurgeCap.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 items-center pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="ct-sortOrder">Sort Order</Label>
          <Input id="ct-sortOrder" type="number" placeholder="0" {...register("sortOrder")} />
          {errors.sortOrder && (
            <p className="text-xs text-destructive">{errors.sortOrder.message}</p>
          )}
        </div>

        <Controller
          name="waitingFeeEnabled"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2 pt-6">
              <input
                id="ct-waitingFee"
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4 accent-primary rounded border-border"
              />
              <Label htmlFor="ct-waitingFee" className="cursor-pointer">
                Enable Waiting Fee
              </Label>
            </div>
          )}
        />
      </div>
    </div>
  );
}
