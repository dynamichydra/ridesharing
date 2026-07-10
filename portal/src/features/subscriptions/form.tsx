import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  subscriptionPlanSchema,
  subscriptionPlanTypeOptions,
  type SubscriptionPlanFormValues,
} from "./schema";
import type { VehicleTypeOption } from "./types";

interface SubscriptionPlanFormProps {
  formId: string;
  defaultValues: SubscriptionPlanFormValues;
  vehicleTypes: VehicleTypeOption[];
  onSubmit: (values: SubscriptionPlanFormValues) => void;
}

// Shared form body reused for both create and edit (the dialog decides
// whether it's calling create or update on submit).
export function SubscriptionPlanForm({
  formId,
  defaultValues,
  vehicleTypes,
  onSubmit,
}: SubscriptionPlanFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SubscriptionPlanFormValues>({
    resolver: zodResolver(subscriptionPlanSchema),
    defaultValues,
  });

  // Re-sync the form whenever a different plan is opened for edit (or the
  // dialog is reopened for create with fresh empty defaults).
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const selectedVehicleTypeIds = watch("vehicleTypeIds");
  const isActive = watch("isActive");

  const toggleVehicleType = (id: string) => {
    const next = selectedVehicleTypeIds.includes(id)
      ? selectedVehicleTypeIds.filter((v) => v !== id)
      : [...selectedVehicleTypeIds, id];
    setValue("vehicleTypeIds", next, { shouldDirty: true });
  };

  const submit = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <form id={formId} onSubmit={submit} className="space-y-4 py-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Plan Title <span className="text-red-500">*</span>
          </Label>
          <Input id="name" placeholder="e.g. Premium Monthly" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Plan Interval</Label>
          <select
            id="type"
            {...register("type")}
            className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            {subscriptionPlanTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">
            Price (₹) <span className="text-red-500">*</span>
          </Label>
          <Input id="price" placeholder="e.g. 299.00" {...register("price")} />
          {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationDays">Duration (Days)</Label>
          <Input id="durationDays" placeholder="e.g. 30" {...register("durationDays")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trialDays">Trial Validity (Days)</Label>
          <Input id="trialDays" placeholder="0" {...register("trialDays")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxRidesPerDay">Max Daily Rides Limit</Label>
          <Input id="maxRidesPerDay" placeholder="Unlimited" {...register("maxRidesPerDay")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="razorpayPlanId">Razorpay Plan ID (Optional)</Label>
        <Input id="razorpayPlanId" placeholder="plan_xxxxxxxxxxxxxx" {...register("razorpayPlanId")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="featuresText">Features (comma separated)</Label>
        <Input
          id="featuresText"
          placeholder="Unlimited matches, Customer support access"
          {...register("featuresText")}
        />
      </div>

      <div className="space-y-2">
        <Label>Eligible Vehicle Types</Label>
        <div className="flex flex-wrap gap-3 border border-border rounded-md p-3">
          {vehicleTypes.length === 0 ? (
            <span className="text-xs text-muted-foreground">No vehicle types found.</span>
          ) : (
            vehicleTypes.map((vt) => (
              <label key={vt.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedVehicleTypeIds.includes(vt.id)}
                  onChange={() => toggleVehicleType(vt.id)}
                  className="h-4 w-4 accent-primary rounded border-border"
                />
                {vt.name}
              </label>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 items-center pt-2">
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Priority Listing Rank</Label>
          <Input id="sortOrder" type="number" {...register("sortOrder")} />
        </div>
        <div className="flex items-center gap-2 self-end h-10">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setValue("isActive", e.target.checked, { shouldDirty: true })}
            className="h-4 w-4 accent-primary rounded border-border"
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Enable Plan Purchase
          </Label>
        </div>
      </div>
    </form>
  );
}