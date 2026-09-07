import { useState } from "react";
import { Tag, Plus, Trash2, Percent, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  usePlanGroupPricing,
  useSetPlanGroupPricing,
  useDeletePlanGroupPricing,
  useDriverGroupOptions,
} from "../hooks";
import type { SubscriptionPlan, LookupOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
}

export function GroupPricingDialog({ open, onOpenChange, plan }: Props) {
  const planId = plan?.id || "";

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [specialPrice, setSpecialPrice] = useState<string>("");
  const [priceMode, setPriceMode] = useState<"percent" | "fixed">("percent");

  const { data: pricingData, isLoading } = usePlanGroupPricing(planId);
  const { data: driverGroups = [] } = useDriverGroupOptions();

  const setMutation = useSetPlanGroupPricing(planId);
  const deleteMutation = useDeletePlanGroupPricing(planId);

  const pricingRules = pricingData?.MESSAGE || [];

  const handleSaveOffer = async () => {
    if (!selectedGroupId) return;

    const payload: any = {
      groupId: selectedGroupId,
      isActive: true,
    };

    if (priceMode === "percent") {
      const pct = Number(discountPercent);
      if (isNaN(pct) || pct <= 0 || pct > 100) return;
      payload.discountPercent = pct;
      payload.specialPriceMinor = null;
    } else {
      const p = parseFloat(specialPrice);
      if (isNaN(p) || p <= 0) return;
      payload.specialPriceMinor = Math.round(p * 100);
      payload.discountPercent = null;
    }

    await setMutation.mutateAsync(payload);
    setSelectedGroupId("");
    setDiscountPercent("");
    setSpecialPrice("");
    setIsAddOpen(false);
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Remove this group pricing offer?")) return;
    await deleteMutation.mutateAsync(id);
  };

  const normalPrice = plan ? `${plan.currencyCode} ${(plan.priceMinor / 100).toFixed(2)}` : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-primary" />
                Group Pricing & Offers: {plan?.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Standard Price: <span className="font-semibold text-foreground">{normalPrice}</span>. Configure special discounts for specific driver cohorts.
              </DialogDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(!isAddOpen)}
              className="gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Offer
            </Button>
          </div>
        </DialogHeader>

        {/* Add Offer Drawer */}
        {isAddOpen && (
          <div className="border border-border rounded-lg p-3 bg-muted/40 space-y-3 mt-2">
            <div className="font-semibold text-sm text-foreground">Create Group Offer</div>
            
            <div className="space-y-1">
              <Label className="text-xs">Select Target Driver Group</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <option value="">-- Select group --</option>
                {driverGroups.map((g: LookupOption) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="priceMode"
                  checked={priceMode === "percent"}
                  onChange={() => setPriceMode("percent")}
                  className="text-primary"
                />
                Percentage Discount (%)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="priceMode"
                  checked={priceMode === "fixed"}
                  onChange={() => setPriceMode("fixed")}
                  className="text-primary"
                />
                Special Override Price ({plan?.currencyCode})
              </label>
            </div>

            {priceMode === "percent" ? (
              <div className="space-y-1">
                <Label className="text-xs">Discount Percentage (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 50 (50% off)"
                    className="h-9 text-xs pr-8"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                  <Percent className="h-3.5 w-3.5 absolute right-3 top-2.5 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Override Price ({plan?.currencyCode})</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 19.99"
                    className="h-9 text-xs pr-8"
                    value={specialPrice}
                    onChange={(e) => setSpecialPrice(e.target.value)}
                  />
                  <DollarSign className="h-3.5 w-3.5 absolute right-3 top-2.5 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveOffer}
                disabled={
                  !selectedGroupId ||
                  (priceMode === "percent" ? !discountPercent : !specialPrice) ||
                  setMutation.isPending
                }
              >
                {setMutation.isPending ? "Saving…" : "Save Offer"}
              </Button>
            </div>
          </div>
        )}

        {/* Existing Offers List */}
        <div className="flex-1 overflow-y-auto min-h-[200px] border border-border rounded-lg mt-2 divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading group offers…</div>
          ) : pricingRules.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No special group offers configured for this plan. All drivers pay the standard price.
            </div>
          ) : (
            pricingRules.map((r: any) => (
              <div
                key={r.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-sm"
              >
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {r.groupName}
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                      {r.groupCode}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.discountPercent != null ? (
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {r.discountPercent}% OFF standard price
                      </span>
                    ) : r.specialPriceMinor != null ? (
                      <span className="font-medium text-primary">
                        Special Price: {plan?.currencyCode} {(r.specialPriceMinor / 100).toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={r.isActive ? "default" : "secondary"} className="text-[10px] capitalize">
                    {r.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    title="Delete offer"
                    onClick={() => handleDeleteOffer(r.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
