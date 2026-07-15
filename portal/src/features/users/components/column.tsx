import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle, UserCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Rider } from "../types";

interface Props {
  onToggleVerify: (rider: Rider) => void;
  onToggleBlock: (rider: Rider) => void;
}

export function getRiderColumns({ onToggleVerify, onToggleBlock }: Props): ColumnDef<Rider>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {row.original.name ? row.original.name[0].toUpperCase() : "U"}
          </div>
          <span className="font-medium text-foreground">{row.original.name || "Unnamed"}</span>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email || "—"}</span>
      ),
    },
    {
      accessorKey: "isVerified",
      header: "Verified",
      cell: ({ row }) =>
        row.original.isVerified ? (
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium text-xs">
            <CheckCircle className="h-4 w-4" /> Verified
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <XCircle className="h-4 w-4" /> Unverified
          </span>
        ),
    },
    {
      accessorKey: "isBlocked",
      header: "Status",
      cell: ({ row }) =>
        row.original.isBlocked ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Blocked
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        ),
    },
    {
      id: "rides",
      header: "Rides / Rating",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-medium">
          {row.original.totalRides} rides / ★ {row.original.rating}
        </span>
      ),
    },
    {
  id: "actions",
  size: 180,
  minSize: 180,
  maxSize: 180,

  header: () => (
    <div className="w-full flex justify-center">
      Actions
    </div>
  ),

  cell: ({ row }) => (
    <div className="w-full flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVerify(row.original);
        }}
        className="h-8 border-border text-xs font-medium hover:bg-muted cursor-pointer"
      >
        <UserCheck className="mr-1 h-3.5 w-3.5" />
        {row.original.isVerified ? "Unverify" : "Verify"}
      </Button>

      <Button
        variant={row.original.isBlocked ? "outline" : "destructive"}
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggleBlock(row.original);
        }}
        className="h-8 text-xs font-medium cursor-pointer"
      >
        <Ban className="mr-1 h-3.5 w-3.5" />
        {row.original.isBlocked ? "Unblock" : "Block"}
      </Button>
    </div>
  ),
},
  ];
}