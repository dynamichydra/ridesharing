import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, EyeOff, Ban } from "lucide-react";
import type { ModerationItem, ModerationAction } from "../types";

export function getModerationColumns({
  onAction,
}: {
  onAction: (item: ModerationItem, action: ModerationAction) => void;
}): ColumnDef<ModerationItem>[] {
  return [
    {
      accessorKey: "contentType",
      header: "Content Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono uppercase text-xs">
          {row.original.contentType}
        </Badge>
      ),
    },
    {
      accessorKey: "flaggedText",
      header: "Flagged Content / Reason",
      cell: ({ row }) => (
        <div className="flex flex-col max-w-[280px]">
          <span className="text-xs font-medium text-foreground line-clamp-2">
            "{row.original.flaggedText || "N/A"}"
          </span>
          <span className="text-[11px] text-destructive mt-0.5">
            Reason: {row.original.flagReason || "User reported"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "authorType",
      header: "Author",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Badge variant="outline" className="w-fit text-xs font-semibold">
            {row.original.authorType}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[100px] mt-0.5">
            {row.original.authorId}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const { status } = row.original;
        let colorClass = "bg-muted text-muted-foreground";
        if (status === "PENDING") colorClass = "bg-amber-500/15 text-amber-600 font-semibold";
        if (status === "APPROVED") colorClass = "bg-emerald-500/15 text-emerald-600";
        if (status === "REDACTED") colorClass = "bg-purple-500/15 text-purple-600";
        if (status === "BANNED") colorClass = "bg-destructive/15 text-destructive font-semibold";

        return (
          <Badge className={`${colorClass} border-none capitalize`}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Take Action",
      cell: ({ row }) => {
        const isPending = row.original.status === "PENDING";
        if (!isPending) {
          return (
            <span className="text-xs text-muted-foreground italic">
              {row.original.resolutionNotes || "Actioned"}
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              onClick={() => onAction(row.original, "approve")}
              title="Approve Content"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
              onClick={() => onAction(row.original, "redact")}
              title="Redact / Hide Content"
            >
              <EyeOff className="h-3.5 w-3.5 mr-1" /> Redact
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onAction(row.original, "ban")}
              title="Ban Author & Remove"
            >
              <Ban className="h-3.5 w-3.5 mr-1" /> Ban
            </Button>
          </div>
        );
      },
    },
  ];
}
