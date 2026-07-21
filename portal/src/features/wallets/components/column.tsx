import type { ColumnDef } from "@tanstack/react-table";
import { Car, User } from "lucide-react";
import type { WalletListItem } from "../types";

function formatMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function getWalletColumns(): ColumnDef<WalletListItem>[] {
  return [
    {
      id: "owner",
      header: "Owner",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {row.original.ownerType === "driver" ? <Car className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div>
            <div className="font-medium text-foreground">{row.original.ownerName || "Unnamed"}</div>
            <div className="text-xs text-muted-foreground">{row.original.ownerPhone}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "ownerType",
      header: "Type",
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-accent text-foreground">
          {row.original.ownerType}
        </span>
      ),
    },
    {
      accessorKey: "balanceMinor",
      header: "Balance",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatMinor(row.original.balanceMinor, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "active" ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
            Frozen
          </span>
        ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];
}
