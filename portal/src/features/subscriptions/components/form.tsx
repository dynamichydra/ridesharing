import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  subscriptionPlanSchema,
  subscriptionPlanTypeOptions,
  type SubscriptionPlanFormValues,
} from "../schema";
import type { LookupOption } from "../types";

interface SubscriptionPlanFormProps {
  formId: string;
  defaultValues: SubscriptionPlanFormValues;
  countries: LookupOption[];
  onSubmit: (values: SubscriptionPlanFormValues) => void;
}

export function SubscriptionPlanForm({
  formId,
  defaultValues,
  countries,
  onSubmit,
}: SubscriptionPlanFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SubscriptionPlanFormValues>({
    resolver: zodResolver(subscriptionPlanSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const planType = watch("type");
  const isLifetime = planType === "lifetime";

  const submit = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <form id={formId} onSubmit={submit} className="space-y-4 py-3">
      <div className="space-y-2">
        <Label htmlFor="name">
          Plan Name <span className="text-red-500">*</span>
        </Label>
        <Input id="name" placeholder="e.g. Premium Monthly" {...register("name")} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="countryId">
            Country <span className="text-red-500">*</span>
          </Label>
          <select
            id="countryId"
            {...register("countryId")}
            className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.countryId && <p className="text-xs text-red-500">{errors.countryId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">
            Plan Type <span className="text-red-500">*</span>
          </Label>
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
          <Label htmlFor="currencyCode">
            Currency <span className="text-red-500">*</span>
          </Label>
          <Input id="currencyCode" placeholder="e.g. INR" {...register("currencyCode")} />
          {errors.currencyCode && (
            <p className="text-xs text-red-500">{errors.currencyCode.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceMinor">
            Price (minor units) <span className="text-red-500">*</span>
          </Label>
          <Input id="priceMinor" type="number" step="1" min="0" placeholder="e.g. 29900" {...register("priceMinor")} />
          {errors.priceMinor && <p className="text-xs text-red-500">{errors.priceMinor.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="durationDays">
            Duration (Days) {!isLifetime && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="durationDays"
            placeholder={isLifetime ? "Not applicable for Lifetime" : "e.g. 30"}
            disabled={isLifetime}
            {...register("durationDays")}
          />
          {errors.durationDays && (
            <p className="text-xs text-red-500">{errors.durationDays.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="trialDays">
            Trial Days <span className="text-red-500">*</span>
          </Label>
          <Input id="trialDays" type="number" step="1" min="0" placeholder="0" {...register("trialDays")} />
          {errors.trialDays && <p className="text-xs text-red-500">{errors.trialDays.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="featuresText">Features (comma separated)</Label>
        <Input
          id="featuresText"
          placeholder="Unlimited matches, Customer support access"
          {...register("featuresText")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxRidesPerDay">Max Rides Per Day</Label>
          <Input id="maxRidesPerDay" placeholder="Unlimited" {...register("maxRidesPerDay")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">
            Sort Order <span className="text-red-500">*</span>
          </Label>
          <Input id="sortOrder" type="number" step="1" {...register("sortOrder")} />
          {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder.message}</p>}
        </div>
      </div>
    </form>
  );
}
