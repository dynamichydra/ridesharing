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
import type { Promo, DiscountType } from "../types";

interface PromoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoToEdit?: Promo | null;
}

export function PromoDialog({ open, onOpenChange, promoToEdit }: PromoDialogProps) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("20");
  const [minFare, setMinFare] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");

  const createMutation = useCreatePromo();
  const updateMutation = useUpdatePromo();

  useEffect(() => {
    if (promoToEdit) {
      setCode(promoToEdit.code || "");
      setDiscountType(promoToEdit.discountType || "PERCENTAGE");
      setDiscountValue(
        promoToEdit.discountType === "PERCENTAGE"
          ? String(promoToEdit.discountValueMinor)
          : String(promoToEdit.discountValueMinor / 100),
      );
      setMinFare(
        promoToEdit.minFareMinor != null ? String(promoToEdit.minFareMinor / 100) : "",
      );
      setMaxDiscount(
        promoToEdit.maxDiscountMinor != null
          ? String(promoToEdit.maxDiscountMinor / 100)
          : "",
      );
      setMaxUses(promoToEdit.maxUses != null ? String(promoToEdit.maxUses) : "");
      setPerUserLimit(
        promoToEdit.perUserLimit != null ? String(promoToEdit.perUserLimit) : "1",
      );
      setExpiresAt(
        promoToEdit.expiresAt ? promoToEdit.expiresAt.split("T")[0] : "",
      );
    } else {
      setCode("");
      setDiscountType("PERCENTAGE");
      setDiscountValue("20");
      setMinFare("");
      setMaxDiscount("");
      setMaxUses("");
      setPerUserLimit("1");
      setExpiresAt("");
    }
  }, [promoToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(discountValue) || 0;
    const discountValueMinor =
      discountType === "PERCENTAGE" ? Math.round(rawVal) : Math.round(rawVal * 100);

    const payload = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValueMinor,
      minFareMinor: minFare ? Math.round(parseFloat(minFare) * 100) : null,
      maxDiscountMinor: maxDiscount ? Math.round(parseFloat(maxDiscount) * 100) : null,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
      perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    if (promoToEdit) {
      await updateMutation.mutateAsync({ id: promoToEdit.id, payload });
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
          <DialogTitle>{promoToEdit ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="code">Coupon / Promo Code</Label>
            <Input
              id="code"
              required
              placeholder="e.g. WELCOME50"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono uppercase font-semibold"
            />
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
                  <SelectItem value="FLAT">Flat Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="val">
                {discountType === "PERCENTAGE" ? "Discount Percentage (%)" : "Flat Value (₹)"}
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
              <Label htmlFor="minFare">Min Fare Required (₹)</Label>
              <Input
                id="minFare"
                type="number"
                placeholder="None"
                value={minFare}
                onChange={(e) => setMinFare(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxDiscount">Max Discount Cap (₹)</Label>
              <Input
                id="maxDiscount"
                type="number"
                placeholder="None"
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
