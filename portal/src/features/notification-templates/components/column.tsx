import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Ban, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationTemplate } from "../types";

const CHANNEL_LABEL: Record<string, string> = {
  push: "Push",
  sms: "Message (SMS)",
  email: "Notification (Email)",
};

const CHANNEL_STYLES: Record<string, string> = {
  push: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sms: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  email: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

interface Props {
  onEdit: (template: NotificationTemplate) => void;
  onPreview: (template: NotificationTemplate) => void;
  onToggleActive: (template: NotificationTemplate) => void;
}

export function getNotificationTemplateColumns({ onEdit, onPreview, onToggleActive }: Props): ColumnDef<NotificationTemplate>[] {
  return [
    {
      accessorKey: "eventType",
      header: "Event",
      cell: ({ row }) => <div className="font-semibold text-foreground">{row.original.eventType}</div>,
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${CHANNEL_STYLES[row.original.channel]}`}>
          {CHANNEL_LABEL[row.original.channel] || row.original.channel}
        </span>
      ),
    },
    {
      accessorKey: "audience",
      header: "Audience",
      cell: ({ row }) => <span className="text-foreground capitalize">{row.original.audience || "Either"}</span>,
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs max-w-xs truncate block">{row.original.subject || "—"}</span>
      ),
    },
    {
      accessorKey: "languageCode",
      header: "Lang",
      cell: ({ row }) => <span className="text-muted-foreground text-xs uppercase">{row.original.languageCode}</span>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
            Inactive
          </span>
        ),
    },
    {
      id: "actions",
      header: () => <div className="w-full text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPreview(row.original)} className="border-border hover:bg-muted cursor-pointer">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(row.original)} className="border-border hover:bg-muted cursor-pointer">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={() => onToggleActive(row.original)}
            className="cursor-pointer"
            title={row.original.isActive ? "Disable" : "Enable"}
          >
            {row.original.isActive ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ),
    },
  ];
}
