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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePromo, useUpdatePromo } from "../hooks";
import type { Promo, DiscountType, LookupOption } from "../types";

interface PromoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoToEdit?: Promo | null;
  countries?: LookupOption[];
  cities?: LookupOption[];
  vehicleTypes?: LookupOption[];
}

export function PromoDialog({
  open,
  onOpenChange,
  promoToEdit,
  countries = [],
  cities = [],
  vehicleTypes = [],
}: PromoDialogProps) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("20");
  const [minFare, setMinFare] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [isFirstRideOnly, setIsFirstRideOnly] = useState(false);

  const createMutation = useCreatePromo();
  const updateMutation = useUpdatePromo();

  useEffect(() => {
    if (promoToEdit) {
      setCode(promoToEdit.code || "");
      setDescription(promoToEdit.description || "");

      const rawType = String(promoToEdit.discountType || "").toLowerCase();
      const isPercent = rawType === "percentage" || rawType === "percent";
      setDiscountType(isPercent ? "PERCENTAGE" : "FLAT");

      const val = promoToEdit.discountValue ?? promoToEdit.discountValueMinor ?? 0;
      setDiscountValue(isPercent ? String(val) : String(val / 100));

      setMinFare(
        promoToEdit.minFareMinor != null ? String(promoToEdit.minFareMinor / 100) : "",
      );
      setMaxDiscount(
        promoToEdit.maxDiscountMinor != null
          ? String(promoToEdit.maxDiscountMinor / 100)
          : "",
      );
      const limit = promoToEdit.maxUses ?? promoToEdit.usageLimit;
      setMaxUses(limit != null ? String(limit) : "");
      setPerUserLimit(
        promoToEdit.perUserLimit != null ? String(promoToEdit.perUserLimit) : "1",
      );
      const exp = promoToEdit.expiresAt || promoToEdit.validUntil;
      setExpiresAt(exp ? exp.split("T")[0] : "");
      setCountryId(promoToEdit.countryId || "");
      setCityId(promoToEdit.cityId || "");
      setVehicleTypeId(promoToEdit.vehicleTypeId || "");
      setIsFirstRideOnly(Boolean(promoToEdit.isFirstRideOnly));
    } else {
      setCode("");
      setDescription("");
      setDiscountType("PERCENTAGE");
      setDiscountValue("20");
      setMinFare("");
      setMaxDiscount("");
      setMaxUses("");
      setPerUserLimit("1");
      setExpiresAt("");
      setCountryId("");
      setCityId("");
      setVehicleTypeId("");
      setIsFirstRideOnly(false);
    }
  }, [promoToEdit, open]);

  const filteredCities = cities.filter((c) => !countryId || !c.countryId || c.countryId === countryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(discountValue) || 0;
    const isPercent = String(discountType).toLowerCase() === "percentage";
    const discountVal = isPercent ? Math.round(rawVal) : Math.round(rawVal * 100);

    const payload = {
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      discountType: isPercent ? ("percentage" as const) : ("flat_amount" as const),
      discountValue: discountVal,
      discountValueMinor: discountVal,
      minFareMinor: minFare ? Math.round(parseFloat(minFare) * 100) : 0,
      maxDiscountMinor: maxDiscount ? Math.round(parseFloat(maxDiscount) * 100) : null,
      usageLimit: maxUses ? parseInt(maxUses, 10) : null,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
      perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
      validUntil: expiresAt ? new Date(expiresAt).toISOString() : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      countryId: countryId || null,
      cityId: cityId || null,
      vehicleTypeId: vehicleTypeId || null,
      isFirstRideOnly,
    };

    if (promoToEdit) {
      await updateMutation.mutateAsync({ id: promoToEdit.id, payload });
    } else {
      await createMutation.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{promoToEdit ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Coupon / Promo Code *</Label>
              <Input
                id="code"
                required
                placeholder="e.g. WELCOME50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono uppercase font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Campaign / Description</Label>
              <Input
                id="desc"
                placeholder="e.g. 50% off first trip"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Regional & Category Scoping */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="promo-country">Country</Label>
              <select
                id="promo-country"
                value={countryId}
                onChange={(e) => {
                  setCountryId(e.target.value);
                  setCityId("");
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-city">City</Label>
              <select
                id="promo-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Cities</option>
                {filteredCities.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-vehicle">Vehicle Class</Label>
              <select
                id="promo-vehicle"
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Vehicles</option>
                {vehicleTypes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(val: DiscountType) => setDiscountType(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FLAT">Flat Amount (Minor / Cash)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="val">
                {String(discountType).toLowerCase() === "percentage"
                  ? "Discount Percentage (%) *"
                  : "Flat Amount (Units) *"}
              </Label>
              <Input
                id="val"
                type="number"
                step="1"
                min="1"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="minFare">Min Fare Required</Label>
              <Input
                id="minFare"
                type="number"
                placeholder="0.00"
                value={minFare}
                onChange={(e) => setMinFare(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxDiscount">Max Discount Cap</Label>
              <Input
                id="maxDiscount"
                type="number"
                placeholder="No limit"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maxUses">Total Uses Limit</Label>
              <Input
                id="maxUses"
                type="number"
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perUser">Per-User Limit</Label>
              <Input
                id="perUser"
                type="number"
                value={perUserLimit}
                onChange={(e) => setPerUserLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          {/* First Ride Only Acquisition Checkbox */}
          <div className="flex items-center gap-2 p-2.5 rounded-md border border-border bg-accent/30">
            <input
              type="checkbox"
              id="first-ride-only"
              checked={isFirstRideOnly}
              onChange={(e) => setIsFirstRideOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="first-ride-only" className="text-xs font-medium cursor-pointer">
              First Ride Only (Restricted to new riders on their very first trip)
            </label>
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
              {isPending ? "Saving..." : promoToEdit ? "Update Promo" : "Create Promo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
