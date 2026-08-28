import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useCreateCommissionRule, useUpdateCommissionRule, useCommissionLookups } from "../hooks";
import type { CommissionRule } from "../types";

interface CommissionRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleToEdit?: CommissionRule | null;
}

export function CommissionRuleDialog({
  open,
  onOpenChange,
  ruleToEdit,
}: CommissionRuleDialogProps) {
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [subscriberRate, setSubscriberRate] = useState("5");
  const [nonSubscriberRate, setNonSubscriberRate] = useState("20");
  const [bookingFee, setBookingFee] = useState("0");
  const [priority, setPriority] = useState("1");

  const { countries, vehicleTypes, isLoading: lookupsLoading } = useCommissionLookups();
  const createMutation = useCreateCommissionRule();
  const updateMutation = useUpdateCommissionRule();

  useEffect(() => {
    if (ruleToEdit) {
      setName(ruleToEdit.name || "");
      setCountryId(ruleToEdit.countryId || "");
      setVehicleTypeId(ruleToEdit.vehicleTypeId || "");
      
      const sub = Number(ruleToEdit.subscriberRate);
      const subPct = sub < 1 ? (sub * 100).toFixed(2).replace(/\.00$/, "") : String(sub);
      setSubscriberRate(subPct);

      const nonSub = Number(ruleToEdit.nonSubscriberRate);
      const nonSubPct = nonSub < 1 ? (nonSub * 100).toFixed(2).replace(/\.00$/, "") : String(nonSub);
      setNonSubscriberRate(nonSubPct);

      setBookingFee(
        ruleToEdit.bookingFeeMinor != null
          ? String(ruleToEdit.bookingFeeMinor / 100)
          : "0",
      );
      setPriority(String(ruleToEdit.priority ?? 1));
    } else {
      setName("");
      setCountryId("");
      setVehicleTypeId("");
      setSubscriberRate("5");
      setNonSubscriberRate("20");
      setBookingFee("0");
      setPriority("1");
    }
  }, [ruleToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subPct = parseFloat(subscriberRate) || 0;
    const nonSubPct = parseFloat(nonSubscriberRate) || 0;

    const payload = {
      name,
      countryId: countryId || null,
      vehicleTypeId: vehicleTypeId || null,
      subscriberRate: subPct / 100,
      nonSubscriberRate: nonSubPct / 100,
      bookingFeeMinor: Math.round((parseFloat(bookingFee) || 0) * 100),
      priority: parseInt(priority, 10) || 1,
    };

    if (ruleToEdit) {
      await updateMutation.mutateAsync({ id: ruleToEdit.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {ruleToEdit ? "Edit Commission Rule" : "Create Commission Rule"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              required
              placeholder="e.g. Standard India Auto Commission"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="country">Country Scope</Label>
              <NativeSelect
                id="country"
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                disabled={lookupsLoading}
              >
                <NativeSelectOption value="">Global (All Countries)</NativeSelectOption>
                {countries.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicleType">Vehicle Type Scope</Label>
              <NativeSelect
                id="vehicleType"
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                disabled={lookupsLoading}
              >
                <NativeSelectOption value="">All Vehicle Types</NativeSelectOption>
                {vehicleTypes.map((vt) => (
                  <NativeSelectOption key={vt.id} value={vt.id}>
                    {vt.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subRate">Subscriber Rate (%)</Label>
              <Input
                id="subRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                placeholder="e.g. 5"
                value={subscriberRate}
                onChange={(e) => setSubscriberRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nonSubRate">Non-Subscriber Rate (%)</Label>
              <Input
                id="nonSubRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                placeholder="e.g. 20"
                value={nonSubscriberRate}
                onChange={(e) => setNonSubscriberRate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bookingFee">Flat Booking Fee (Base unit)</Label>
              <Input
                id="bookingFee"
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 10"
                value={bookingFee}
                onChange={(e) => setBookingFee(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Fixed fee platform keeps per ride</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority">Resolution Priority</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Higher wins during overlap</p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : ruleToEdit
                ? "Update Rule"
                : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

