import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useCreateCommissionRule, useUpdateCommissionRule } from "../hooks";
import type { CommissionRule, CommissionBase, LookupOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rule: CommissionRule | null;
  countries: LookupOption[];
  cities?: (LookupOption & { countryId?: string })[];
  vehicleTypes: LookupOption[];
}

export function CommissionRuleFormDialog({ open, onOpenChange, mode, rule, countries, cities = [], vehicleTypes }: Props) {
  const createMutation = useCreateCommissionRule();
  const updateMutation = useUpdateCommissionRule();

  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState(""); // "" = global (every country)
  const [cityId, setCityId] = useState("");       // "" = all cities in country
  const [vehicleTypeId, setVehicleTypeId] = useState(""); // "" = every vehicle type
  const [commissionBase, setCommissionBase] = useState<CommissionBase>("fare_after_booking_fee");
  const [bookingFee, setBookingFee] = useState(""); // major units, e.g. "2.50"
  const [platformFee, setPlatformFee] = useState(""); // major units, e.g. "1.00"
  const [minCommission, setMinCommission] = useState(""); // major units, e.g. "15.00"
  const [maxCommission, setMaxCommission] = useState(""); // major units, e.g. "250.00"
  const [subscriberPct, setSubscriberPct] = useState("");
  const [nonSubscriberPct, setNonSubscriberPct] = useState("");
  const [priority, setPriority] = useState("1");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && rule) {
      setName(rule.name);
      setCountryId(rule.countryId || "");
      setCityId(rule.cityId || "");
      setVehicleTypeId(rule.vehicleTypeId || "");
      setCommissionBase(rule.commissionBase || "fare_after_booking_fee");
      setBookingFee((rule.bookingFeeMinor / 100).toString());
      setPlatformFee(rule.platformFeeMinor ? (rule.platformFeeMinor / 100).toString() : "0");
      setMinCommission(rule.minCommissionMinor ? (rule.minCommissionMinor / 100).toString() : "");
      setMaxCommission(rule.maxCommissionMinor ? (rule.maxCommissionMinor / 100).toString() : "");
      setSubscriberPct((Number(rule.subscriberRate) * 100).toString());
      setNonSubscriberPct((Number(rule.nonSubscriberRate) * 100).toString());
      setPriority(String(rule.priority));
      setEffectiveFrom(rule.effectiveFrom ? rule.effectiveFrom.slice(0, 10) : "");
      setEffectiveTo(rule.effectiveTo ? rule.effectiveTo.slice(0, 10) : "");
    } else {
      setName("");
      setCountryId("");
      setCityId("");
      setVehicleTypeId("");
      setCommissionBase("fare_after_booking_fee");
      setBookingFee("0");
      setPlatformFee("0");
      setMinCommission("");
      setMaxCommission("");
      setSubscriberPct("");
      setNonSubscriberPct("");
      setPriority("1");
      setEffectiveFrom("");
      setEffectiveTo("");
    }
  }, [open, mode, rule]);

  // Filter cities by selected country (if country is selected)
  const filteredCities = cities.filter((c) => !countryId || !c.countryId || c.countryId === countryId);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subscriberRate = Number(subscriberPct) / 100;
    const nonSubscriberRate = Number(nonSubscriberPct) / 100;
    if (!name.trim() || Number.isNaN(subscriberRate) || Number.isNaN(nonSubscriberRate)) return;

    const payload = {
      name: name.trim(),
      countryId: countryId || undefined,
      cityId: cityId || undefined,
      vehicleTypeId: vehicleTypeId || undefined,
      commissionBase,
      bookingFeeMinor: Math.round(Number(bookingFee || 0) * 100),
      platformFeeMinor: Math.round(Number(platformFee || 0) * 100),
      subscriberRate,
      nonSubscriberRate,
      minCommissionMinor: minCommission ? Math.round(Number(minCommission) * 100) : 0,
      maxCommissionMinor: maxCommission ? Math.round(Number(maxCommission) * 100) : null,
      priority: Number(priority) || 1,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
    };

    if (mode === "create") {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else if (rule) {
      updateMutation.mutate({ id: rule.id, payload }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? "Add Commission Rule" : "Edit Commission Rule"}
            {mode === "edit" && rule?.version && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                Version {rule.version}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cr-name">Name</Label>
            <Input id="cr-name" placeholder="e.g. Mumbai Sedan Rule" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cr-country">Country</Label>
              <NativeSelect
                id="cr-country"
                value={countryId}
                onChange={(e) => {
                  setCountryId(e.target.value);
                  setCityId("");
                }}
              >
                <NativeSelectOption value="">All (Global)</NativeSelectOption>
                {countries.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-city">City</Label>
              <NativeSelect
                id="cr-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
              >
                <NativeSelectOption value="">All Cities</NativeSelectOption>
                {filteredCities.map((ct) => (
                  <NativeSelectOption key={ct.id} value={ct.id}>
                    {ct.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-vehicle-type">Vehicle Type</Label>
              <NativeSelect id="cr-vehicle-type" value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)}>
                <NativeSelectOption value="">All Types</NativeSelectOption>
                {vehicleTypes.map((v) => (
                  <NativeSelectOption key={v.id} value={v.id}>
                    {v.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cr-commission-base">Commission Base Calculation</Label>
              <NativeSelect
                id="cr-commission-base"
                value={commissionBase}
                onChange={(e) => setCommissionBase(e.target.value as CommissionBase)}
              >
                <NativeSelectOption value="fare_after_booking_fee">Fare After Booking Fee (Standard)</NativeSelectOption>
                <NativeSelectOption value="gross_fare">Gross Passenger Fare</NativeSelectOption>
                <NativeSelectOption value="driver_fare">Driver Net Metered Fare</NativeSelectOption>
                <NativeSelectOption value="net_fare">Net Fare (After Promo & Fees)</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-priority">Priority (Tie-Breaker)</Label>
              <Input id="cr-priority" type="number" step="1" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cr-booking-fee">Booking Fee</Label>
              <Input
                id="cr-booking-fee"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 20.00"
                value={bookingFee}
                onChange={(e) => setBookingFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-platform-fee">Platform Fee</Label>
              <Input
                id="cr-platform-fee"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 0.00"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-min-comm">Min Floor</Label>
              <Input
                id="cr-min-comm"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 10.00"
                value={minCommission}
                onChange={(e) => setMinCommission(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-max-comm">Max Cap</Label>
              <Input
                id="cr-max-comm"
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                value={maxCommission}
                onChange={(e) => setMaxCommission(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cr-subscriber-rate">Subscriber Commission Rate (%)</Label>
              <Input
                id="cr-subscriber-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 15"
                value={subscriberPct}
                onChange={(e) => setSubscriberPct(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-non-subscriber-rate">Non-Subscriber Rate (%)</Label>
              <Input
                id="cr-non-subscriber-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 25"
                value={nonSubscriberPct}
                onChange={(e) => setNonSubscriberPct(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cr-effective-from">Effective From (Optional)</Label>
              <Input
                id="cr-effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-effective-to">Effective To (Optional)</Label>
              <Input
                id="cr-effective-to"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {mode === "create" ? "Create Rule" : "Save Rule Version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
