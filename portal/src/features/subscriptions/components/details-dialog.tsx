import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Star,
  Car,
  Tag,
  CreditCard,
  Sparkles,
} from "lucide-react";
import type { SubscriptionPlan, LookupOption } from "../types";

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
  if (!plan) return null;

  const allowedVehicleTypeNames = plan.vehicleTypeIds?.length
    ? plan.vehicleTypeIds.map(
        (id) => vehicleTypes.find((v) => v.id === id)?.name ?? id
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            {plan.name}
          </DialogTitle>
          <DialogDescription>Full plan configuration and matching rules.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="border border-border p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
              <Tag className="h-4 w-4" /> Plan Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Country" value={countryName(countries, plan.countryId)} />
              <InfoField label="Type" value={<span className="capitalize">{plan.type}</span>} />
              <InfoField label="Price" value={formatPrice(plan.priceMinor, plan.currencyCode)} />
              <InfoField
                label="Duration"
                value={plan.durationDays ? `${plan.durationDays} days` : "Lifetime"}
              />
              <InfoField label="Trial Days" value={plan.trialDays} />
              <InfoField label="Sort Order" value={plan.sortOrder} />
              <InfoField
                label="Status"
                value={
                  plan.isActive ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5" /> Inactive
                    </span>
                  )
                }
              />
              <InfoField
                label="Created"
                value={plan.createdAt ? new Date(plan.createdAt).toLocaleString() : "—"}
              />
            </div>
          </div>

          <div className="border border-border p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
              <Car className="h-4 w-4" /> Matching Rules (Enforced)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoField
                label="Max Rides / Day"
                value={plan.maxRidesPerDay ? plan.maxRidesPerDay : "Unlimited"}
              />
              <InfoField
                label="Priority Matching"
                value={
                  plan.priorityMatching ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Star className="h-3.5 w-3.5" /> Enabled
                    </span>
                  ) : (
                    "Off"
                  )
                }
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1.5">Allowed Vehicle Types</span>
              {allowedVehicleTypeNames ? (
                <div className="flex flex-wrap gap-1.5">
                  {allowedVehicleTypeNames.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs font-normal">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">All vehicle types</span>
              )}
            </div>
          </div>

          <div className="border border-border p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" /> Marketing Features
            </h4>
            <p className="text-xs text-muted-foreground -mt-2">
              Display-only copy shown to drivers — not enforced by the platform.
            </p>
            {plan.features && plan.features.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {plan.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs font-normal">
                    {feature}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No features listed.</span>
            )}
          </div>

          {(plan.gateway || plan.gatewayPlanId) && (
            <div className="border border-border p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm text-primary">Billing Gateway</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Gateway" value={plan.gateway || "—"} />
                <InfoField label="Gateway Plan ID" value={plan.gatewayPlanId || "—"} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
