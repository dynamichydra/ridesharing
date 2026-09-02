import type { ColumnDef } from "@tanstack/react-table";
import { Shield, Smartphone, User, Cog } from "lucide-react";
import type { AuditLog } from "../types";
import { formatDateTime } from "@/lib/utils";

const ACTOR_ICON: Record<string, typeof Shield> = {
  admin: Shield,
  driver: Smartphone,
  rider: User,
  system: Cog,
};

const ACTION_COLOR_MAP: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ENABLED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UNBLOCKED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  DISABLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  BLOCKED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function actionColor(action: string): string {
  const match = Object.keys(ACTION_COLOR_MAP).find((suffix) => action.endsWith(suffix));
  return match
    ? ACTION_COLOR_MAP[match]
    : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400";
}

export function getAuditLogColumns(): ColumnDef<AuditLog>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "When",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "actorType",
      header: "Actor",
      cell: ({ row }) => {
        const Icon = ACTOR_ICON[row.original.actorType ?? ""] ?? Cog;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs font-medium capitalize text-foreground">
                {row.original.actorType || "system"}
              </div>
              {row.original.actorId && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  {row.original.actorId.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-[11px] font-semibold rounded-full whitespace-nowrap ${actionColor(row.original.action)}`}
        >
          {row.original.action}
        </span>
      ),
    },
    {
      id: "entity",
      header: "Entity",
      cell: ({ row }) =>
        row.original.entityType ? (
          <div className="text-xs">
            <span className="text-foreground capitalize">{row.original.entityType.replace(/_/g, " ")}</span>
            {row.original.entityId && (
              <div className="text-[10px] text-muted-foreground font-mono">
                {row.original.entityId.slice(0, 8)}...
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      accessorKey: "meta",
      header: "Details",
      cell: ({ row }) =>
        row.original.meta ? (
          <span className="text-[11px] text-muted-foreground font-mono block max-w-xs truncate" title={JSON.stringify(row.original.meta)}>
            {JSON.stringify(row.original.meta)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground font-mono">{row.original.ip || "—"}</span>
      ),
    },
  ];
}
