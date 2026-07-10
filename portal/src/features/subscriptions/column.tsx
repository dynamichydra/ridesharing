import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, Edit2, Trash2, XCircle } from "lucide-react";
import type { SubscriptionPlan } from "./types";

export interface SubscriptionPlanColumn {
  key: string;
  header: string;
  className?: string;
  render: (plan: SubscriptionPlan) => ReactNode;
}

interface ColumnActions {
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
}

export function getSubscriptionPlanColumns({
  onEdit,
  onDelete,
}: ColumnActions): SubscriptionPlanColumn[] {
  return [
    {
      key: "name",
      header: "Plan Name",
      render: (plan) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold">{plan.name}</div>
            <div className="text-xs text-muted-foreground">Order priority: {plan.sortOrder}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Interval Type",
      className: "capitalize text-muted-foreground",
      render: (plan) => <>{plan.type}</>,
    },
    {
      key: "price",
      header: "Price",
      className: "text-muted-foreground font-semibold",
      render: (plan) => <>₹{plan.price}</>,
    },
    {
      key: "validity",
      header: "Validity",
      className: "text-muted-foreground",
      render: (plan) => (
        <>
          {plan.durationDays ? `${plan.durationDays} Days` : "Lifetime"}
          {plan.trialDays > 0 ? ` (+${plan.trialDays}d Trial)` : ""}
        </>
      ),
    },
    {
      key: "maxRides",
      header: "Max Daily Rides",
      className: "text-muted-foreground",
      render: (plan) => <>{plan.maxRidesPerDay ? `${plan.maxRidesPerDay} rides/day` : "Unlimited"}</>,
    },
    {
      key: "razorpayPlanId",
      header: "Razorpay Plan ID",
      className: "text-muted-foreground text-xs font-mono",
      render: (plan) => <>{plan.razorpayPlanId || "—"}</>,
    },
    {
      key: "status",
      header: "Status",
      render: (plan) =>
        plan.isActive ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-xs">
            <CheckCircle className="h-3.5 w-3.5" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <XCircle className="h-3.5 w-3.5" /> Inactive
          </span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (plan) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(plan)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(plan)}
            className="text-xs border-border text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      ),
    },
  ];
}