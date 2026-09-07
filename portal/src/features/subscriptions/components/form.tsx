import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  subscriptionPlanSchema,
  subscriptionPlanTypeOptions,
  type SubscriptionPlanFormValues,
} from "../schema";
import type { LookupOption } from "../types";

// Freeform marketing bullets (display-only, not enforced) — a plain tag/chip input rather than
// the fixed-catalog MultiSelect, since there's no predefined list of allowed feature strings.
function FeatureChipsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {value.map((feature) => (
          <Badge key={feature} variant="secondary" className="flex items-center gap-1">
            <span>{feature}</span>
            <X
              className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onChange(value.filter((f) => f !== feature))}
            />
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => {
          if (e.target.value.endsWith(",")) {
            setDraft(e.target.value.slice(0, -1));
            commitDraft();
            return;
          }
          setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitDraft();
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commitDraft}
        placeholder="Type a feature and press Enter…"
      />
    </div>
  );
}

interface SubscriptionPlanFormProps {
  formId: string;
  defaultValues: SubscriptionPlanFormValues;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
  driverGroups?: LookupOption[];
  onSubmit: (values: SubscriptionPlanFormValues) => void;
}

export function SubscriptionPlanForm({
  formId,
  defaultValues,
  countries,
  vehicleTypes,
  driverGroups = [],
  onSubmit,
}: SubscriptionPlanFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SubscriptionPlanFormValues>({
    resolver: zodResolver(subscriptionPlanSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const planType = watch("type");
  const isLifetime = planType === "lifetime";

  const submit = handleSubmit((values) => {
    onSubmit(values as SubscriptionPlanFormValues);
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
          <Input id="priceMinor" type="number" step="1" min="0" placeholder="e.g. 29900" {...register("priceMinor", { valueAsNumber: true })} />
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
          <Input id="trialDays" type="number" step="1" min="0" placeholder="0" {...register("trialDays", { valueAsNumber: true })} />
          {errors.trialDays && <p className="text-xs text-red-500">{errors.trialDays.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Features (marketing copy — not enforced)</Label>
        <Controller
          control={control as any}
          name="features"
          render={({ field }) => (
            <FeatureChipsInput value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.features && "message" in errors.features && (
          <p className="text-xs text-red-500">{errors.features.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Allowed Vehicle Types (empty = all types)</Label>
        <Controller
          control={control as any}
          name="vehicleTypeIds"
          render={({ field }) => (
            <MultiSelect
              options={vehicleTypes.map((v) => ({ label: v.name, value: v.id }))}
              value={field.value}
              onChange={field.onChange}
              placeholder="All vehicle types"
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Target Driver Groups (empty = public to all drivers in country)</Label>
        <Controller
          control={control as any}
          name="allowedGroupIds"
          render={({ field }) => (
            <MultiSelect
              options={driverGroups.map((g) => ({ label: g.name, value: g.id }))}
              value={field.value || []}
              onChange={field.onChange}
              placeholder="Public / Open to all drivers"
            />
          )}
        />
        <p className="text-[11px] text-muted-foreground">
          If selected, only drivers assigned to these groups will see or qualify for this plan.
        </p>
      </div>

      {/* Dynamic Entitlements & Platform Perks */}
      <div className="border border-border rounded-lg p-3.5 bg-muted/20 space-y-3">
        <div className="font-semibold text-xs text-foreground uppercase tracking-wider">
          Plan Entitlements & Perks (Enforced System Capabilities)
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="entitlement-commission" className="text-xs">
              Platform Commission Cut (%)
            </Label>
            <Input
              id="entitlement-commission"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="e.g. 5 (5% cut)"
              className="h-9 text-xs"
              {...register("entitlements.commissionRatePercent")}
            />
            <p className="text-[10px] text-muted-foreground">Overrides standard rule at settlement</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="entitlement-priority" className="text-xs">
              Dispatch Priority Score Bonus
            </Label>
            <Input
              id="entitlement-priority"
              type="number"
              step="0.05"
              min="0"
              max="1.0"
              placeholder="e.g. 0.25"
              className="h-9 text-xs"
              {...register("entitlements.priorityScoreBonus")}
            />
            <p className="text-[10px] text-muted-foreground">Custom weight in dispatch scoring</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="entitlement-instant-payout"
            type="checkbox"
            className="h-4 w-4 rounded border-border cursor-pointer text-primary"
            {...register("entitlements.freeInstantPayouts")}
          />
          <Label htmlFor="entitlement-instant-payout" className="cursor-pointer text-xs font-normal">
            Free Instant Wallet-to-Bank Payouts (0% cashout fee)
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxRidesPerDay">Max Rides Per Day</Label>
          <Input id="maxRidesPerDay" placeholder="Unlimited" {...register("maxRidesPerDay")} />
          {errors.maxRidesPerDay && (
            <p className="text-xs text-red-500">{errors.maxRidesPerDay.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">
            Sort Order <span className="text-red-500">*</span>
          </Label>
          <Input id="sortOrder" type="number" step="1" {...register("sortOrder", { valueAsNumber: true })} />
          {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder.message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="priorityMatching"
          type="checkbox"
          className="h-4 w-4 rounded border-border cursor-pointer"
          {...register("priorityMatching")}
        />
        <Label htmlFor="priorityMatching" className="cursor-pointer">
          Priority matching (boosts this plan's drivers in ride matching)
        </Label>
      </div>
    </form>
  );
}
