import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Car,
  Tag,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Zap,
  History,
  Users,
  Percent,
} from "lucide-react";
import type { SubscriptionPlan, LookupOption } from "../types";
import { formatDateTime, formatDate } from "@/lib/utils";
import { usePlanVersions, usePlanGroupPricing } from "../hooks";

interface SubscriptionPlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
}

function countryName(countries: LookupOption[], id: string): string {
  return countries.find((c) => c.id === id)?.name || id;
}

function formatPrice(priceMinor: number, currencyCode: string): string {
  return `${currencyCode} ${(priceMinor / 100).toFixed(2)}`;
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SubscriptionPlanDetailsDialog({
  open,
  onOpenChange,
  plan,
  countries,
  vehicleTypes,
}: SubscriptionPlanDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { data: versionsData, isLoading: isLoadingVersions } = usePlanVersions(plan?.id || "");
  const { data: groupPricingData, isLoading: isLoadingGroupPricing } = usePlanGroupPricing(plan?.id || "");

  const versions = versionsData?.MESSAGE || [];
  const groupOffers = groupPricingData?.MESSAGE || [];

  if (!plan) return null;

  const allowedVehicleTypeNames = plan.vehicleTypeIds?.length
    ? plan.vehicleTypeIds.map(
        (id) => vehicleTypes.find((v) => v.id === id)?.name ?? id
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>{plan.name}</span>
            {plan.version && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                v{plan.version}
              </span>
            )}
            {plan.isActive ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                Inactive
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Full commercial plan configuration, entitlements, version history, and group discounts.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex items-center gap-1.5">
              <History className="h-4 w-4" /> Versions ({versions.length})
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Group Offers ({groupOffers.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & ENTITLEMENTS */}
          <TabsContent value="overview" className="space-y-4">
            <div className="border border-border p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <Tag className="h-4 w-4" /> Pricing & Base Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Country" value={countryName(countries, plan.countryId)} />
                <InfoField label="Type" value={<span className="capitalize">{plan.type}</span>} />
                <InfoField label="Price" value={formatPrice(plan.priceMinor, plan.currencyCode)} />
                <InfoField
                  label="Duration"
                  value={plan.durationDays ? `${plan.durationDays} days` : "Lifetime"}
                />
                <InfoField label="Trial Days" value={plan.trialDays ? `${plan.trialDays} days` : "None"} />
                <InfoField label="Sort Order" value={plan.sortOrder} />
                {plan.gateway && (
                  <InfoField
                    label="Gateway"
                    value={
                      <span className="capitalize text-foreground font-semibold">
                        {plan.gateway} {plan.gatewayPlanId ? `(${plan.gatewayPlanId})` : ""}
                      </span>
                    }
                  />
                )}
                <InfoField label="Created" value={formatDateTime(plan.createdAt)} />
              </div>
            </div>

            <div className="border border-border p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <ShieldCheck className="h-4 w-4" /> Commercial Entitlements
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="Custom Commission Rate"
                  value={
                    plan.entitlements?.commissionRate !== undefined && plan.entitlements?.commissionRate !== null
                      ? `${Number(plan.entitlements.commissionRate) * 100}%`
                      : "Standard Tier Rate"
                  }
                />
                <InfoField
                  label="Booking Fee Policy"
                  value={
                    plan.entitlements?.waiveBookingFee ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Waived</span>
                    ) : plan.entitlements?.customBookingFeeMinor ? (
                      formatPrice(plan.entitlements.customBookingFeeMinor, plan.currencyCode)
                    ) : (
                      "Standard Rule Fee"
                    )
                  }
                />
                <InfoField
                  label="Priority Score Bonus"
                  value={
                    plan.priorityMatching || plan.entitlements?.priorityScoreBonus ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <Star className="h-3.5 w-3.5" /> +{plan.entitlements?.priorityScoreBonus || "0.25"} Score
                      </span>
                    ) : (
                      "None"
                    )
                  }
                />
                <InfoField
                  label="Instant Payouts"
                  value={
                    plan.entitlements?.freeInstantPayouts ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Zap className="h-3.5 w-3.5" /> Free Instant Cashout
                      </span>
                    ) : (
                      "Standard Fees"
                    )
                  }
                />
                <InfoField
                  label="Max Rides / Day"
                  value={plan.maxRidesPerDay || plan.entitlements?.maxRidesPerDay ? `${plan.maxRidesPerDay || plan.entitlements?.maxRidesPerDay} rides` : "Unlimited"}
                />
                <InfoField
                  label="Support Level"
                  value={<span className="capitalize">{plan.entitlements?.supportLevel || "Standard"}</span>}
                />
              </div>
            </div>

            <div className="border border-border p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <Car className="h-4 w-4" /> Vehicle & Feature Rules
              </h4>
              <div>
                <span className="text-xs text-muted-foreground block mb-1.5">Allowed Vehicle Types</span>
                {allowedVehicleTypeNames && allowedVehicleTypeNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allowedVehicleTypeNames.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs font-normal">
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">All vehicle types supported</span>
                )}
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1.5">Marketing Features</span>
                {plan.features && plan.features.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {plan.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs font-normal">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No features listed.</span>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: VERSION HISTORY */}
          <TabsContent value="versions" className="space-y-4">
            {isLoadingVersions ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading plan versions...</div>
            ) : versions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No historical versions found for this plan.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-2.5 font-semibold">Version</th>
                      <th className="p-2.5 font-semibold">Name</th>
                      <th className="p-2.5 font-semibold">Price</th>
                      <th className="p-2.5 font-semibold">Effective Period</th>
                      <th className="p-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {versions.map((v: any) => (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="p-2.5 font-bold text-foreground">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">v{v.version}</span>
                        </td>
                        <td className="p-2.5 font-medium text-foreground">{v.name}</td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {formatPrice(v.priceMinor, v.currencyCode)}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {formatDate(v.effectiveFrom)} → {v.effectiveTo ? formatDate(v.effectiveTo) : "Present"}
                        </td>
                        <td className="p-2.5">
                          {v.isActive ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Archived
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: GROUP OFFERS */}
          <TabsContent value="offers" className="space-y-4">
            {isLoadingGroupPricing ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading group pricing offers...</div>
            ) : groupOffers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No targeted group pricing or special offers configured for this plan.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-2.5 font-semibold">Driver Group</th>
                      <th className="p-2.5 font-semibold">Discount / Special Price</th>
                      <th className="p-2.5 font-semibold">Valid Period</th>
                      <th className="p-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groupOffers.map((o: any) => (
                      <tr key={o.id} className="hover:bg-muted/30">
                        <td className="p-2.5 font-medium text-foreground">
                          {o.groupName} <span className="text-muted-foreground font-mono">({o.groupCode})</span>
                        </td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {o.discountPercent != null ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <Percent className="h-3 w-3" /> {o.discountPercent}% Off
                            </span>
                          ) : o.specialPriceMinor != null ? (
                            formatPrice(o.specialPriceMinor, plan.currencyCode)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {o.startDate ? formatDate(o.startDate) : "Always"} →{" "}
                          {o.endDate ? formatDate(o.endDate) : "Indefinite"}
                        </td>
                        <td className="p-2.5">
                          {o.isActive ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Disabled
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
