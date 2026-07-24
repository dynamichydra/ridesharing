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
import type { CommissionRule, LookupOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rule: CommissionRule | null;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
}

export function CommissionRuleFormDialog({ open, onOpenChange, mode, rule, countries, vehicleTypes }: Props) {
  const createMutation = useCreateCommissionRule();
  const updateMutation = useUpdateCommissionRule();

  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState(""); // "" = global (every country)
  const [vehicleTypeId, setVehicleTypeId] = useState(""); // "" = every vehicle type
  const [bookingFee, setBookingFee] = useState(""); // major units, e.g. "2.50"
  const [subscriberPct, setSubscriberPct] = useState("");
  const [nonSubscriberPct, setNonSubscriberPct] = useState("");
  const [priority, setPriority] = useState("1");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && rule) {
      setName(rule.name);
      setCountryId(rule.countryId || "");
      setVehicleTypeId(rule.vehicleTypeId || "");
      setBookingFee((rule.bookingFeeMinor / 100).toString());
      setSubscriberPct((Number(rule.subscriberRate) * 100).toString());
      setNonSubscriberPct((Number(rule.nonSubscriberRate) * 100).toString());
      setPriority(String(rule.priority));
    } else {
      setName("");
      setCountryId("");
      setVehicleTypeId("");
      setBookingFee("0");
      setSubscriberPct("");
      setNonSubscriberPct("");
      setPriority("1");
    }
  }, [open, mode, rule]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subscriberRate = Number(subscriberPct) / 100;
    const nonSubscriberRate = Number(nonSubscriberPct) / 100;
    if (!name.trim() || Number.isNaN(subscriberRate) || Number.isNaN(nonSubscriberRate)) return;

    const payload = {
      name: name.trim(),
      countryId: countryId || undefined,
      vehicleTypeId: vehicleTypeId || undefined,
      bookingFeeMinor: Math.round(Number(bookingFee || 0) * 100),
      subscriberRate,
      nonSubscriberRate,
      priority: Number(priority) || 1,
    };

    if (mode === "create") {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else if (rule) {
      updateMutation.mutate({ id: rule.id, payload }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Commission Rule" : "Edit Commission Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cr-name">Name</Label>
            <Input id="cr-name" placeholder="e.g. Global default" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cr-country">Country</Label>
              <NativeSelect id="cr-country" value={countryId} onChange={(e) => setCountryId(e.target.value)}>
                <NativeSelectOption value="">All countries (global)</NativeSelectOption>
                {countries.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-vehicle-type">Vehicle Type</Label>
              <NativeSelect id="cr-vehicle-type" value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)}>
                <NativeSelectOption value="">All vehicle types</NativeSelectOption>
                {vehicleTypes.map((v) => (
                  <NativeSelectOption key={v.id} value={v.id}>
                    {v.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-booking-fee">Booking Fee</Label>
            <Input
              id="cr-booking-fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 2.50 — taken off the top before the % split"
              value={bookingFee}
              onChange={(e) => setBookingFee(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cr-subscriber-rate">Subscriber Rate (%)</Label>
              <Input
                id="cr-subscriber-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 15"
                value={subscriberPct}
                onChange={(e) => setSubscriberPct(e.target.value)}
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
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-priority">Priority</Label>
            <Input id="cr-priority" type="number" step="1" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
