import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { History, CreditCard, Tag, Calendar, CheckCircle2, Clock } from "lucide-react";
import type { SubscriptionPlan } from "../types";
import { usePlanVersions } from "../hooks";
import { formatDate, formatDateTime } from "@/lib/utils";

interface PlanVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
}

function formatPrice(priceMinor: number, currencyCode: string): string {
  return `${currencyCode} ${(priceMinor / 100).toFixed(2)}`;
}

export function PlanVersionsDialog({
  open,
  onOpenChange,
  plan,
}: PlanVersionsDialogProps) {
  const { data: versionsData, isLoading } = usePlanVersions(plan?.id || "");
  const versions = versionsData?.MESSAGE || plan?.versions || [];

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>{plan.name} — Version History</span>
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                {versions.length} {versions.length === 1 ? "Version" : "Versions"}
              </span>
            </DialogTitle>
          </div>
          <DialogDescription>
            Audit log of all commercial terms, price revisions, and historical versions for this subscription plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-border rounded-lg p-3 bg-accent/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Current Version</span>
                <div className="text-lg font-bold text-primary">v{plan.version || versions[0]?.version || 1}</div>
              </div>
              <Tag className="h-4 w-4 text-primary/70" />
            </div>
            <div className="border border-border rounded-lg p-3 bg-accent/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Current Price</span>
                <div className="text-lg font-bold text-foreground">
                  {formatPrice(plan.priceMinor, plan.currencyCode)}
                </div>
              </div>
              <CreditCard className="h-4 w-4 text-primary/70" />
            </div>
            <div className="border border-border rounded-lg p-3 bg-accent/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Plan Type</span>
                <div className="text-lg font-bold text-foreground capitalize">{plan.type}</div>
              </div>
              <Calendar className="h-4 w-4 text-primary/70" />
            </div>
          </div>

          {/* Versions Table */}
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading plan versions...</div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              No version history records found.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-2.5 font-semibold">Version</th>
                    <th className="p-2.5 font-semibold">Price</th>
                    <th className="p-2.5 font-semibold">Duration / Trial</th>
                    <th className="p-2.5 font-semibold">Effective Window</th>
                    <th className="p-2.5 font-semibold">Change Reason</th>
                    <th className="p-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {versions.map((v: any, index: number) => {
                    const isLatest = index === 0;
                    return (
                      <tr
                        key={v.id || v.version}
                        className={isLatest ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-muted/30"}
                      >
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              v{v.version}
                            </span>
                            {isLatest && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                                Latest
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {formatPrice(v.priceMinor, v.currencyCode)}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          <div>{v.durationDays ? `${v.durationDays} Days` : "Lifetime"}</div>
                          {v.trialDays > 0 && (
                            <span className="text-[10px] text-sky-600 dark:text-sky-400">
                              +{v.trialDays}d Trial
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground/70" />
                            <span>
                              {v.effectiveFrom ? formatDate(v.effectiveFrom) : "—"} →{" "}
                              {v.effectiveTo ? formatDate(v.effectiveTo) : "Present"}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/60 block">
                            Created {formatDateTime(v.createdAt)}
                          </span>
                        </td>
                        <td className="p-2.5 text-muted-foreground max-w-[180px] truncate" title={v.changeSummary || ""}>
                          {v.changeSummary || "Initial version"}
                        </td>
                        <td className="p-2.5">
                          {v.isActive && isLatest ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                              Superseded
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
