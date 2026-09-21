import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { PricingVersionFormValues } from "../schema";

export interface PricingVersionLookups {
  countries?: Array<{ id: string; name: string; currencyCode?: string; isoCode?: string }>;
  currencies?: Array<{ id: string; code: string; name: string; symbol?: string }>;
  vehicleTypes?: Array<{ id: string; name: string; capacity?: number | string }>;
  cities?: Array<{ id: string; name: string; countryId?: string }>;
  zones?: Array<{ id: string; name: string; countryId?: string }>;
}

interface PricingVersionFormProps {
  mode: "create" | "edit";
  values: PricingVersionFormValues;
  setValues: (values: PricingVersionFormValues) => void;
  errors: Partial<Record<keyof PricingVersionFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isPending: boolean;
  lookups?: PricingVersionLookups;
}

export default function PricingVersionForm({
  mode,
  values,
  setValues,
  errors,
  onSubmit,
  onCancel,
  submitLabel,
  isPending,
  lookups = {},
}: PricingVersionFormProps) {
  const {
    countries = [],
    currencies = [],
    vehicleTypes = [],
    cities = [],
    zones = [],
  } = lookups;

  const update = <K extends keyof PricingVersionFormValues>(
    key: K,
    value: PricingVersionFormValues[K]
  ) => {
    setValues({ ...values, [key]: value });
  };

  // When country changes, auto-select currency matching country's currencyCode (if available),
  // and reset cityId / zoneId if they no longer match the new country.
  const handleCountryChange = (countryId: string | null) => {
    const nextUpdates: Partial<PricingVersionFormValues> = { countryId };

    if (countryId) {
      const selectedCountry = countries.find((c) => c.id === countryId);
      if (selectedCountry?.currencyCode) {
        const matchingCurr = currencies.find(
          (curr) => curr.code.toUpperCase() === selectedCountry.currencyCode?.toUpperCase()
        );
        if (matchingCurr) {
          nextUpdates.currencyId = matchingCurr.id;
        }
      }

      // If existing city/zone belongs to another country, clear it
      if (values.cityId) {
        const currentCity = cities.find((c) => c.id === values.cityId);
        if (currentCity?.countryId && currentCity.countryId !== countryId) {
          nextUpdates.cityId = null;
        }
      }
      if (values.zoneId) {
        const currentZone = zones.find((z) => z.id === values.zoneId);
        if (currentZone?.countryId && currentZone.countryId !== countryId) {
          nextUpdates.zoneId = null;
        }
      }
    }

    setValues({ ...values, ...nextUpdates });
  };

  // Filter cities and zones contextually when a country is selected
  const filteredCities = useMemo(() => {
    if (!values.countryId) return cities;
    return cities.filter((c) => !c.countryId || c.countryId === values.countryId);
  }, [cities, values.countryId]);

  const filteredZones = useMemo(() => {
    if (!values.countryId) return zones;
    return zones.filter((z) => !z.countryId || z.countryId === values.countryId);
  }, [zones, values.countryId]);

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3 max-h-[75vh] overflow-y-auto px-1">
      <div className="text-xs text-muted-foreground">
        {mode === "create"
          ? "Set up new base fare configuration and optional target scope."
          : "Update existing fare rates, multipliers, and target scope."}
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
        Target Scope (Select applicable regions & vehicle types)
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="countryId">Country</Label>
          <NativeSelect
            id="countryId"
            value={values.countryId || ""}
            onChange={(e) => handleCountryChange(e.target.value || null)}
          >
            <NativeSelectOption value="">Global / All Countries</NativeSelectOption>
            {countries.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name} {c.isoCode ? `(${c.isoCode})` : ""} {c.currencyCode ? `· ${c.currencyCode}` : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.countryId && <p className="text-xs text-destructive">{errors.countryId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currencyId">Currency</Label>
          <NativeSelect
            id="currencyId"
            value={values.currencyId || ""}
            onChange={(e) => update("currencyId", e.target.value || null)}
          >
            <NativeSelectOption value="">Default / Select Currency</NativeSelectOption>
            {currencies.map((curr) => (
              <NativeSelectOption key={curr.id} value={curr.id}>
                {curr.code} — {curr.name} ({curr.symbol})
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.currencyId && <p className="text-xs text-destructive">{errors.currencyId}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vehicleTypeId">Vehicle Type</Label>
        <NativeSelect
          id="vehicleTypeId"
          value={values.vehicleTypeId || ""}
          onChange={(e) => update("vehicleTypeId", e.target.value || null)}
        >
          <NativeSelectOption value="">All Vehicle Types</NativeSelectOption>
          {vehicleTypes.map((vt) => (
            <NativeSelectOption key={vt.id} value={vt.id}>
              {vt.name} {vt.capacity ? `(Cap: ${vt.capacity})` : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {errors.vehicleTypeId && <p className="text-xs text-destructive">{errors.vehicleTypeId}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cityId">City</Label>
          <NativeSelect
            id="cityId"
            value={values.cityId || ""}
            onChange={(e) => update("cityId", e.target.value || null)}
          >
            <NativeSelectOption value="">All Cities / Any</NativeSelectOption>
            {filteredCities.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.cityId && <p className="text-xs text-destructive">{errors.cityId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zoneId">Zone</Label>
          <NativeSelect
            id="zoneId"
            value={values.zoneId || ""}
            onChange={(e) => update("zoneId", e.target.value || null)}
          >
            <NativeSelectOption value="">All Zones / Any</NativeSelectOption>
            {filteredZones.map((z) => (
              <NativeSelectOption key={z.id} value={z.id}>
                {z.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.zoneId && <p className="text-xs text-destructive">{errors.zoneId}</p>}
        </div>
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 pt-2">
        Core Fares (Minor Units e.g. 500 = 5.00)
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="baseFareMinor">
            Base Fare (minor) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="baseFareMinor"
            type="number"
            placeholder="e.g. 500"
            value={values.baseFareMinor}
            onChange={(e) => update("baseFareMinor", Number(e.target.value))}
            required
          />
          {errors.baseFareMinor && <p className="text-xs text-destructive">{errors.baseFareMinor}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minFareMinor">
            Min Fare (minor) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="minFareMinor"
            type="number"
            placeholder="e.g. 700"
            value={values.minFareMinor}
            onChange={(e) => update("minFareMinor", Number(e.target.value))}
            required
          />
          {errors.minFareMinor && <p className="text-xs text-destructive">{errors.minFareMinor}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="perKmRateMinor">
            Per KM Rate (minor) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="perKmRateMinor"
            type="number"
            placeholder="e.g. 150"
            value={values.perKmRateMinor}
            onChange={(e) => update("perKmRateMinor", Number(e.target.value))}
            required
          />
          {errors.perKmRateMinor && <p className="text-xs text-destructive">{errors.perKmRateMinor}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="perMinRateMinor">
            Per Min Rate (minor) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="perMinRateMinor"
            type="number"
            placeholder="e.g. 25"
            value={values.perMinRateMinor}
            onChange={(e) => update("perMinRateMinor", Number(e.target.value))}
            required
          />
          {errors.perMinRateMinor && <p className="text-xs text-destructive">{errors.perMinRateMinor}</p>}
        </div>
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 pt-2">
        Additional Fees
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="waitingPricePerMinMinor">Waiting Price / Min (minor)</Label>
          <Input
            id="waitingPricePerMinMinor"
            type="number"
            value={values.waitingPricePerMinMinor}
            onChange={(e) => update("waitingPricePerMinMinor", Number(e.target.value))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bookingFeeMinor">Booking Fee (minor)</Label>
          <Input
            id="bookingFeeMinor"
            type="number"
            value={values.bookingFeeMinor}
            onChange={(e) => update("bookingFeeMinor", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cancellationFeeMinor">Cancellation Fee (minor)</Label>
          <Input
            id="cancellationFeeMinor"
            type="number"
            value={values.cancellationFeeMinor}
            onChange={(e) => update("cancellationFeeMinor", Number(e.target.value))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="noShowFeeMinor">No Show Fee (minor)</Label>
          <Input
            id="noShowFeeMinor"
            type="number"
            value={values.noShowFeeMinor}
            onChange={(e) => update("noShowFeeMinor", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 pt-2">
        Multipliers & Taxes
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="surgeFloorMultiplier">Surge Floor</Label>
          <Input
            id="surgeFloorMultiplier"
            placeholder="1.00"
            value={values.surgeFloorMultiplier}
            onChange={(e) => update("surgeFloorMultiplier", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="surgeCapMultiplier">Surge Cap</Label>
          <Input
            id="surgeCapMultiplier"
            placeholder="3.00"
            value={values.surgeCapMultiplier}
            onChange={(e) => update("surgeCapMultiplier", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="taxPercentage">Tax %</Label>
          <Input
            id="taxPercentage"
            placeholder="0.00"
            value={values.taxPercentage}
            onChange={(e) => update("taxPercentage", e.target.value)}
          />
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
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
