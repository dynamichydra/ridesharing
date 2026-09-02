import type { ColumnDef } from "@tanstack/react-table";
import { Info, Banknote, CreditCard, Wallet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { Ride } from "../types";

interface Props {
  onViewDetails: (ride: Ride) => void;
  onViewPayments: (ride: Ride) => void;
  onDownloadInvoice: (ride: Ride) => void;
}

const statusColorMap: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  started: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function getStatusColor(status: string): string {
  return statusColorMap[status] ?? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
}

const paymentStatusColorMap: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export function getRideColumns({ onViewDetails, onViewPayments, onDownloadInvoice }: Props): ColumnDef<Ride>[] {
  return [
    {
      id: "details",
      header: "Ride Details",
      cell: ({ row }) => (
        <>
          <div className="font-semibold text-foreground">ID: {row.original.id.slice(0, 8)}...</div>
          <div className="text-xs text-muted-foreground">
            {formatDateTime(row.original.requestedAt)}
          </div>
        </>
      ),
    },
    {
      id: "pickup",
      header: "Pickup Address",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate" title={row.original.pickupAddress || ""}>
          {row.original.pickupAddress || `(${row.original.pickupLat}, ${row.original.pickupLng})`}
        </span>
      ),
    },
    {
      id: "drop",
      header: "Drop Address",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate" title={row.original.dropAddress || ""}>
          {row.original.dropAddress || `(${row.original.dropLat}, ${row.original.dropLng})`}
        </span>
      ),
    },
    {
      id: "fare",
      header: "Fare Metrics",
      cell: ({ row }) => (
        <>
          <div className="font-medium text-foreground">
            Final: ₹{row.original.finalFare || row.original.estimatedFare || "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            Est: ₹{row.original.estimatedFare || "—"} | {row.original.distanceKm || "0"} km
          </div>
        </>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      cell: ({ row }) => {
        const { paymentMethod, paymentStatus } = row.original;
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`w-fit px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                paymentStatusColorMap[paymentStatus] ?? paymentStatusColorMap.pending
              }`}
            >
              {paymentStatus}
            </span>
            {paymentMethod && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                {paymentMethod === "cash" ? (
                  <Banknote className="h-3 w-3" />
                ) : (
                  <CreditCard className="h-3 w-3" />
                )}
                {paymentMethod}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      size: 160,
      minSize: 160,
      maxSize: 160,
      header: () => <div className="w-full text-center">Actions</div>,
      cell: ({ row }) => {
        const isCompleted = row.original.status === "completed";
        return (
          <div className="w-full flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onViewDetails(row.original)}
              className="h-8 w-8"
              title="View Logs"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!isCompleted}
              onClick={() => onViewPayments(row.original)}
              className="h-8 w-8"
              title="Payment History"
            >
              <Wallet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!isCompleted}
              onClick={() => onDownloadInvoice(row.original)}
              className="h-8 w-8"
              title="Download Invoice"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];
}
