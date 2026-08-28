import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, UserPlus } from "lucide-react";
import type { CorporateAccount } from "../types";

export function getCorporateAccountColumns({
  onAddUser,
  onGenerateInvoice,
}: {
  onAddUser: (account: CorporateAccount) => void;
  onGenerateInvoice: (account: CorporateAccount) => void;
}): ColumnDef<CorporateAccount>[] {
  return [
    {
      accessorKey: "name",
      header: "Company Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.billingEmail}</span>
        </div>
      ),
    },
    {
      accessorKey: "creditLimitMinor",
      header: "Credit Limit",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold">
          ₹{(row.original.creditLimitMinor / 100).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "currentExposureMinor",
      header: "Current Exposure",
      cell: ({ row }) => {
        const exposure = row.original.currentExposureMinor / 100;
        const limit = row.original.creditLimitMinor / 100;
        const usagePercent = limit > 0 ? (exposure / limit) * 100 : 0;
        return (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-semibold text-amber-600">
              ₹{exposure.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {usagePercent.toFixed(1)}% of credit line
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "availableCredit",
      header: "Available Credit",
      cell: ({ row }) => {
        const available = (row.original.creditLimitMinor - row.original.currentExposureMinor) / 100;
        return (
          <span className="font-mono text-sm font-medium text-emerald-600">
            ₹{available.toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.status === "active"
              ? "bg-emerald-500/15 text-emerald-600 border-none capitalize"
              : "bg-muted text-muted-foreground border-none capitalize"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAddUser(row.original)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Add User
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onGenerateInvoice(row.original)}
          >
            <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
          </Button>
        </div>
      ),
    },
  ];
}
