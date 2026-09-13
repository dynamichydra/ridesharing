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
  User,
  CreditCard,
  Calendar,
  Clock,
  History,
  Activity,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  Ban,
  XCircle,
  AlertOctagon,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useSubscriptionDetail } from "../hooks";
import { formatDateTime, formatDate } from "@/lib/utils";
import type { DriverSubscriber, SubscriptionStatus } from "../types";

interface DriverSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriber: DriverSubscriber | null;
}

function formatPrice(priceMinor?: number | null, currencyCode?: string | null): string {
  if (priceMinor == null || !currencyCode) return "—";
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

function getStatusBadge(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
        </Badge>
      );
    case "trialing":
      return (
        <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-medium">
          <Clock className="h-3 w-3 mr-1" /> Trialing
        </Badge>
      );
    case "paused":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
          <PauseCircle className="h-3 w-3 mr-1" /> Paused
        </Badge>
      );
    case "past_due":
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-medium">
          <AlertTriangle className="h-3 w-3 mr-1" /> Past Due
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">
          <Ban className="h-3 w-3 mr-1" /> Cancelled
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 font-medium">
          <XCircle className="h-3 w-3 mr-1" /> Expired
        </Badge>
      );
    case "payment_failed":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-medium">
          <AlertOctagon className="h-3 w-3 mr-1" /> Payment Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="capitalize">
          {status}
        </Badge>
      );
  }
}

export function DriverSubscriptionDialog({
  open,
  onOpenChange,
  subscriber,
}: DriverSubscriptionDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { data: detailData, isLoading } = useSubscriptionDetail(
    subscriber?.id ? subscriber.id : ""
  );

  const detail = detailData?.MESSAGE || subscriber;
  const payments = (detailData?.MESSAGE as any)?.payments || [];
  const events = (detailData?.MESSAGE as any)?.events || [];

  if (!subscriber) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span>Subscription Details</span>
              {detail && getStatusBadge(detail.status)}
            </DialogTitle>
          </div>
          <DialogDescription>
            Driver membership subscription lifecycle, billing history, and state changes.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Payments ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1.5">
              <History className="h-4 w-4" /> Timeline ({events.length})
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            {/* Driver Profile */}
            <div className="border border-border rounded-lg p-4 space-y-3 bg-accent/10">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary" /> Driver Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Driver Name" value={detail?.driver?.name || "—"} />
                <InfoField label="Phone" value={detail?.driver?.phone || "—"} />
                <InfoField label="Email" value={detail?.driver?.email || "—"} />
                <InfoField
                  label="Approval Status"
                  value={
                    <Badge variant="outline" className="capitalize text-xs">
                      {detail?.driver?.approvalStatus || "approved"}
                    </Badge>
                  }
                />
              </div>
            </div>

            {/* Plan Details */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <CreditCard className="h-4 w-4 text-primary" /> Plan Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="Plan Name"
                  value={
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {detail?.plan?.name || "—"}
                      {detail?.planVersion?.version && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-primary/10 text-primary">
                          v{detail.planVersion.version}
                        </span>
                      )}
                    </span>
                  }
                />
                <InfoField
                  label="Plan Type"
                  value={<span className="capitalize">{detail?.plan?.type || "Custom"}</span>}
                />
                <InfoField
                  label="Price"
                  value={formatPrice(
                    detail?.amountMinor ?? detail?.plan?.priceMinor,
                    detail?.currencyCode ?? detail?.plan?.currencyCode
                  )}
                />
                <InfoField
                  label="Duration"
                  value={detail?.plan?.durationDays ? `${detail.plan.durationDays} Days` : "Lifetime"}
                />
              </div>
            </div>

            {/* Subscription Lifecycle & Dates */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" /> Period & Status Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="Start Date"
                  value={detail?.startDate ? formatDate(detail.startDate) : "—"}
                />
                <InfoField
                  label="Current Period End"
                  value={
                    detail?.currentPeriodEnd
                      ? formatDate(detail.currentPeriodEnd)
                      : detail?.endDate
                      ? formatDate(detail.endDate)
                      : "Lifetime"
                  }
                />
                <InfoField
                  label="Auto-Renew"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        detail?.autoRenew
                          ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs"
                          : "bg-muted text-muted-foreground border-border text-xs"
                      }
                    >
                      {detail?.autoRenew ? (
                        <span className="flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> Enabled
                        </span>
                      ) : (
                        "Disabled"
                      )}
                    </Badge>
                  }
                />
                {detail?.trialEndsAt && (
                  <InfoField
                    label="Trial Ends At"
                    value={formatDate(detail.trialEndsAt)}
                  />
                )}
                {detail?.pausedAt && (
                  <InfoField
                    label="Paused Date"
                    value={formatDateTime(detail.pausedAt)}
                  />
                )}
                {detail?.cancelledAt && (
                  <>
                    <InfoField
                      label="Cancelled Date"
                      value={formatDateTime(detail.cancelledAt)}
                    />
                    <InfoField
                      label="Cancellation Reason"
                      value={detail.cancelNote || "No note provided"}
                    />
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading payment records...</div>
            ) : payments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No payment attempts recorded for this subscription yet.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-2.5 font-semibold">Date</th>
                      <th className="p-2.5 font-semibold">Amount</th>
                      <th className="p-2.5 font-semibold">Gateway</th>
                      <th className="p-2.5 font-semibold">Reference</th>
                      <th className="p-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="p-2.5 text-foreground">{formatDateTime(p.createdAt)}</td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {formatPrice(p.amountMinor, p.currencyCode)}
                        </td>
                        <td className="p-2.5 capitalize text-muted-foreground">{p.gateway || "Standard"}</td>
                        <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                          {p.gatewayPaymentId || p.gatewayOrderId || p.id}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={
                              p.status === "COMPLETED" || p.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : p.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* TIMELINE / EVENTS TAB */}
          <TabsContent value="timeline" className="space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading event history...</div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No lifecycle audit events recorded.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
                {events.map((ev: any) => (
                  <div key={ev.id} className="relative flex items-start gap-3 pl-8">
                    <div className="absolute left-2 top-1.5 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
                    <div className="flex-1 bg-muted/30 border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <Activity className="h-3 w-3 text-primary" />
                          {ev.eventType}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(ev.createdAt)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {ev.fromStatus && (
                          <span>
                            From: <strong className="text-foreground capitalize">{ev.fromStatus}</strong>
                          </span>
                        )}
                        <span>
                          To: <strong className="text-foreground capitalize">{ev.toStatus}</strong>
                        </span>
                        <span>•</span>
                        <span className="capitalize">By: {ev.actorType}</span>
                      </div>
                      {ev.reason && (
                        <p className="text-xs text-foreground/80 italic mt-1 bg-background/50 p-1.5 rounded">
                          "{ev.reason}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
