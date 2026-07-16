import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { VehicleTypePricingFormValues } from "../schema";

interface Props {
  values: VehicleTypePricingFormValues;
  setValues: (v: VehicleTypePricingFormValues) => void;
  errors: Partial<Record<keyof VehicleTypePricingFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
}

// Amounts are entered as major-unit decimals (e.g. "15.00") and converted x100
// to minor units on submit — only correct for 2-decimal currencies (INR, CAD,
// both confirmed in the API doc's examples). A zero-decimal currency (e.g. JPY)
// would need a different conversion here.
export default function PricingForm({
  values,
  setValues,
  errors,
  onSubmit,
  onCancel,
  isPending,
}: Props) {
  const update = <K extends keyof VehicleTypePricingFormValues>(
    key: K,
    value: VehicleTypePricingFormValues[K]
  ) => {
    setValues({ ...values, [key]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3">
      <div className="space-y-2">
        <Label htmlFor="currencyCode">
          Currency <span className="text-red-500">*</span>
        </Label>
        <Input
          id="currencyCode"
          placeholder="e.g. INR"
          value={values.currencyCode}
          onChange={(e) => update("currencyCode", e.target.value.toUpperCase())}
          required
        />
        {errors.currencyCode && (
          <p className="text-xs text-destructive">{errors.currencyCode}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="baseRate">
            Base Fare <span className="text-red-500">*</span>
          </Label>
          <Input
            id="baseRate"
            placeholder="15.00"
            value={values.baseRate}
            onChange={(e) => update("baseRate", e.target.value)}
            required
          />
          {errors.baseRate && <p className="text-xs text-destructive">{errors.baseRate}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="perKmRate">
            Per KM Rate <span className="text-red-500">*</span>
          </Label>
          <Input
            id="perKmRate"
            placeholder="6.00"
            value={values.perKmRate}
            onChange={(e) => update("perKmRate", e.target.value)}
            required
          />
          {errors.perKmRate && <p className="text-xs text-destructive">{errors.perKmRate}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="perMinRate">
            Per Minute Rate <span className="text-red-500">*</span>
          </Label>
          <Input
            id="perMinRate"
            placeholder="0.50"
            value={values.perMinRate}
            onChange={(e) => update("perMinRate", e.target.value)}
            required
          />
          {errors.perMinRate && <p className="text-xs text-destructive">{errors.perMinRate}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="minFare">
            Minimum Fare <span className="text-red-500">*</span>
          </Label>
          <Input
            id="minFare"
            placeholder="30.00"
            value={values.minFare}
            onChange={(e) => update("minFare", e.target.value)}
            required
          />
          {errors.minFare && <p className="text-xs text-destructive">{errors.minFare}</p>}
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save Pricing"}
        </Button>
      </DialogFooter>
    </form>
  );
}