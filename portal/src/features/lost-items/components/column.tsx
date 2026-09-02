import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import type { LostItem } from "../types";
import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/utils";

export function getLostItemColumns({
  onEditStatus,
}: {
  onEditStatus: (item: LostItem) => void;
}): ColumnDef<LostItem>[] {
  return [
    {
      accessorKey: "itemCategory",
      header: "Category & Description",
      cell: ({ row }) => (
        <div className="flex flex-col max-w-[240px]">
          <span className="font-semibold text-foreground capitalize">
            {row.original.itemCategory}
          </span>
          <span className="text-xs text-muted-foreground line-clamp-2">
            {row.original.description}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "rideId",
      header: "Ride ID",
      cell: ({ row }) => (
        <Link
          to={`/rides?rideId=${row.original.rideId}`}
          className="font-mono text-xs text-primary hover:underline font-medium"
        >
          {row.original.rideId}
        </Link>
      ),
    },
    {
      accessorKey: "reporterRole",
      header: "Reported By",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Badge variant="outline" className="w-fit text-xs font-semibold capitalize">
            {row.original.reporterRole}
          </Badge>
          {row.original.contactPhone && (
            <span className="text-xs text-muted-foreground mt-0.5">
              {row.original.contactPhone}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const { status } = row.original;
        let color = "bg-muted text-muted-foreground";
        if (status === "open") color = "bg-amber-500/15 text-amber-600 font-semibold";
        if (status === "driver_contacted") color = "bg-blue-500/15 text-blue-600";
        if (status === "item_found") color = "bg-purple-500/15 text-purple-600";
        if (status === "returned") color = "bg-emerald-500/15 text-emerald-600 font-semibold";
        if (status === "closed") color = "bg-muted text-muted-foreground";

        return (
          <Badge className={`${color} border-none capitalize`}>
            {status.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Reported At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs cursor-pointer"
          onClick={() => onEditStatus(row.original)}
        >
          <Edit3 className="h-3.5 w-3.5 mr-1" /> Update Status
        </Button>
      ),
    },
  ];
}
