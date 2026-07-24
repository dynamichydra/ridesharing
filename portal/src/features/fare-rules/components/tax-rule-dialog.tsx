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
import { useCreateTaxRule, useUpdateTaxRule } from "../hooks";
import type { TaxRule, TaxAppliesTo, LookupOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  taxRule: TaxRule | null;
  countries: LookupOption[];
}

export function TaxRuleFormDialog({ open, onOpenChange, mode, taxRule, countries }: Props) {
  const createMutation = useCreateTaxRule();
  const updateMutation = useUpdateTaxRule();

  const [countryId, setCountryId] = useState("");
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState<TaxAppliesTo>("fare");
  const [ratePct, setRatePct] = useState("");
  const [isInclusive, setIsInclusive] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && taxRule) {
      setCountryId(taxRule.countryId);
      setName(taxRule.name);
      setAppliesTo(taxRule.appliesTo);
      setRatePct((Number(taxRule.rate) * 100).toString());
      setIsInclusive(taxRule.isInclusive);
    } else {
      setCountryId("");
      setName("");
      setAppliesTo("fare");
      setRatePct("");
      setIsInclusive(false);
    }
  }, [open, mode, taxRule]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(ratePct) / 100;
    if (!countryId || !name.trim() || !ratePct || Number.isNaN(rate)) return;

    if (mode === "create") {
      createMutation.mutate(
        { countryId, name: name.trim(), appliesTo, rate, isInclusive },
        { onSuccess: () => onOpenChange(false) },
      );
    } else if (taxRule) {
      updateMutation.mutate(
        { id: taxRule.id, payload: { countryId, name: name.trim(), appliesTo, rate, isInclusive } },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Tax Rule" : "Edit Tax Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tr-country">Country</Label>
            <NativeSelect id="tr-country" value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              <NativeSelectOption value="">Select a country</NativeSelectOption>
              {countries.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-name">Name</Label>
            <Input id="tr-name" placeholder="e.g. GST, HST, PST" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-applies-to">Applies To</Label>
            <NativeSelect
              id="tr-applies-to"
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value as TaxAppliesTo)}
            >
              <NativeSelectOption value="fare">Ride Fares</NativeSelectOption>
              <NativeSelectOption value="subscription">Subscriptions</NativeSelectOption>
              <NativeSelectOption value="both">Both</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-rate">Rate (%)</Label>
            <Input
              id="tr-rate"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 13 for 13%"
              value={ratePct}
              onChange={(e) => setRatePct(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="tr-inclusive"
              type="checkbox"
              checked={isInclusive}
              onChange={(e) => setIsInclusive(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-border"
            />
            <Label htmlFor="tr-inclusive" className="cursor-pointer font-normal">
              Rate is already included in the price (inclusive)
            </Label>
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
