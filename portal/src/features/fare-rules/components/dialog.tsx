import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FareRuleForm from "./form";
import type { FareRuleFormValues } from "../schema";
import type { FareRule, LookupOption } from "../types";


// View details dialog — read-only, backed by GET /fare/rules/:id      


interface ViewFareRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: FareRule | null;
  isLoading: boolean;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
  zones: LookupOption[];
}

const RULE_TYPE_LABEL: Record<string, string> = {
  time: "Time-based",
  traffic: "Traffic-based",
  zone: "Zone-based",
};

function nameFromId(options: LookupOption[], id: string | null): string {
  if (!id) return "—";
  return options.find((o) => o.id === id)?.name || id;
}

export function ViewFareRuleDialog({
  open,
  onOpenChange,
  rule,
  isLoading,
  countries,
  vehicleTypes,
  zones,
}: ViewFareRuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Fare Rule Details</DialogTitle>
          <DialogDescription>Read-only view of this fare rule's configuration.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading rule…</div>
        ) : rule ? (
          <div className="space-y-3 py-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Rule Name</span>
              <span className="font-medium text-foreground">{rule.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">Rule Type</span>
                <span className="font-medium text-foreground">
                  {RULE_TYPE_LABEL[rule.ruleType] || rule.ruleType}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Country</span>
                <span className="font-medium text-foreground">
                  {nameFromId(countries, rule.countryId)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Vehicle Type</span>
                <span className="font-medium text-foreground">
                  {nameFromId(vehicleTypes, rule.vehicleTypeId)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Priority</span>
                <span className="font-medium text-foreground">{rule.priority}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Multiplier</span>
                <span className="font-medium text-foreground">{rule.multiplier}x</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status</span>
                <span className="font-medium text-foreground">
                  {rule.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {rule.ruleType === "time" && (
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div>
                  <span className="text-xs text-muted-foreground block">Time Window</span>
                  <span className="font-medium text-foreground">
                    {rule.startTime} – {rule.endTime}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Days of Week</span>
                  <span className="font-medium text-foreground">
                    {(rule.daysOfWeek ?? []).join(", ") || "—"}
                  </span>
                </div>
              </div>
            )}

            {rule.ruleType === "traffic" && (
              <div className="border-t border-border pt-3">
                <span className="text-xs text-muted-foreground block">Traffic Delay</span>
                <span className="font-medium text-foreground">{rule.trafficDelayS}s</span>
              </div>
            )}

            {rule.ruleType === "zone" && (
              <div className="border-t border-border pt-3">
                <span className="text-xs text-muted-foreground block">Zone</span>
                <span className="font-medium text-foreground">
                  {nameFromId(zones, rule.zoneId)}
                </span>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <span className="text-xs text-muted-foreground block">Created</span>
              <span className="font-medium text-foreground">
                {rule.createdAt ? new Date(rule.createdAt).toLocaleString() : "—"}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">Rule not found.</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Create / Edit dialog — same form, different copy depending on mode  


interface FareRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues: FareRuleFormValues;
  onSubmit: (values: FareRuleFormValues) => void;
  isPending: boolean;
  isLoadingDefaults?: boolean;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
  zones: LookupOption[];
}

export function FareRuleFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmit,
  isPending,
  isLoadingDefaults,
  countries,
  vehicleTypes,
  zones,
}: FareRuleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Fare Rule" : "Edit Fare Rule"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define a new surge/multiplier rule based on time, zone, or traffic conditions."
              : "Update the multiplier, conditions, or status for this fare rule."}
          </DialogDescription>
        </DialogHeader>
        {isLoadingDefaults ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading rule…</div>
        ) : (
          <FareRuleForm
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            submitLabel={mode === "create" ? "Create Rule" : "Save Changes"}
            isPending={isPending}
            countries={countries}
            vehicleTypes={vehicleTypes}
            zones={zones}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

