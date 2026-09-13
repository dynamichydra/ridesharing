import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  AlertTriangle,
  Ban,
  XCircle,
  AlertOctagon,
  Eye,
  Play,
  Pause,
  RotateCcw,
  User,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DriverSubscriber, SubscriptionStatus } from "../types";
import { formatDate } from "@/lib/utils";

interface Props {
  onViewDetails: (subscriber: DriverSubscriber) => void;
  onPause: (subscriber: DriverSubscriber) => void;
  onResume: (subscriber: DriverSubscriber) => void;
  onCancel: (subscriber: DriverSubscriber) => void;
}

function formatPrice(amountMinor?: number | null, currencyCode?: string | null): string {
  if (amountMinor == null || !currencyCode) return "—";
  return `${currencyCode} ${(amountMinor / 100).toFixed(2)}`;
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

function getPeriodCountdown(endDate?: string | null) {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="text-[11px] text-rose-500 font-medium">Expired {Math.abs(diffDays)}d ago</span>;
  }
  if (diffDays === 0) {
    return <span className="text-[11px] text-amber-500 font-medium">Expires today</span>;
  }
  if (diffDays <= 7) {
    return <span className="text-[11px] text-amber-500 font-medium">{diffDays} days left</span>;
  }
  return <span className="text-[11px] text-muted-foreground">{diffDays} days left</span>;
}

export function getSubscriberColumns({
  onViewDetails,
  onPause,
  onResume,
  onCancel,
}: Props): ColumnDef<DriverSubscriber>[] {
  return [
    {
      accessorKey: "driver",
      header: "Driver",
      cell: ({ row }) => {
        const driver = row.original.driver;
        const initials = driver?.name
          ? driver.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "DR";

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 rounded-full bg-primary/10 text-primary font-semibold">
              <AvatarFallback className="text-xs">{initials || <User className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                <span>{driver?.name || "Unknown Driver"}</span>
                {driver?.isBlocked && (
                  <span title="Driver is Blocked" className="text-rose-500">
                    <ShieldAlert className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{driver?.phone || "No phone"}</span>
              {driver?.email && <span className="text-[11px] text-muted-foreground/80">{driver.email}</span>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "plan",
      header: "Plan & Version",
      cell: ({ row }) => {
        const plan = row.original.plan;
        const version = row.original.planVersion;
        const amount = row.original.amountMinor ?? plan?.priceMinor;
        const currency = row.original.currencyCode ?? plan?.currencyCode;

        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-medium text-foreground text-sm">
              <span>{plan?.name || "—"}</span>
              {version?.version && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-primary/10 text-primary">
                  v{version.version}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="capitalize font-medium text-foreground/80">{plan?.type || "custom"}</span>
              <span>•</span>
              <span className="font-semibold text-foreground/90">{formatPrice(amount, currency)}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 items-start">
          {getStatusBadge(row.original.status)}
          {row.original.status === "paused" && row.original.pausedAt && (
            <span className="text-[10px] text-muted-foreground">
              Since {formatDate(row.original.pausedAt)}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "currentPeriod",
      header: "Period / Duration",
      cell: ({ row }) => {
        const start = row.original.currentPeriodStart || row.original.startDate;
        const end = row.original.currentPeriodEnd || row.original.endDate;

        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {start ? formatDate(start) : "—"} {end ? `→ ${formatDate(end)}` : "→ Lifetime"}
            </span>
            {getPeriodCountdown(end)}
          </div>
        );
      },
    },
    {
      accessorKey: "autoRenew",
      header: "Auto-Renew",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.autoRenew
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs"
              : "bg-muted text-muted-foreground border-border text-xs"
          }
        >
          {row.original.autoRenew ? (
            <span className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Enabled
            </span>
          ) : (
            "Disabled"
          )}
        </Badge>
      ),
    },
    {
      id: "actions",
      size: 140,
      minSize: 140,
      maxSize: 140,
      header: () => <div className="w-full text-center">Actions</div>,
      cell: ({ row }) => {
        const item = row.original;
        const isPaused = item.status === "paused";
        const canPause = item.status === "active" || item.status === "trialing";
        const canResume = isPaused;
        const canCancel = ["active", "trialing", "past_due", "paused"].includes(item.status);

        return (
          <div className="w-full flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(item);
              }}
              className="h-8 w-8 cursor-pointer"
              title="View Subscription Full Details"
            >
              <Eye className="h-3.5 w-3.5 text-foreground" />
            </Button>

            {canPause && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onPause(item);
                }}
                className="h-8 w-8 text-amber-600 hover:text-amber-700 cursor-pointer"
                title="Pause Subscription"
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            )}

            {canResume && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onResume(item);
                }}
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                title="Resume Subscription"
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}

            {canCancel && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(item);
                }}
                className="h-8 w-8 text-rose-600 hover:text-rose-700 cursor-pointer"
                title="Cancel Subscription"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
