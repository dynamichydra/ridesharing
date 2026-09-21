import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getModerationColumns } from "../components/column";
import { ModerationActionDialog } from "../components/dialog";
import { useModerationQueue } from "../hooks";
import type { ModerationItem, ModerationAction } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Pending Review", value: "PENDING" },
      { label: "Approved", value: "APPROVED" },
      { label: "Redacted", value: "REDACTED" },
      { label: "Banned", value: "BANNED" },
    ],
  },
  contentType: {
    label: "Content Type",
    operator: "equals",
    type: "select",
    field: "contentType",
    placeholder: "All Types",
    options: [
      { label: "Review", value: "REVIEW" },
      { label: "Message", value: "MESSAGE" },
      { label: "Profile Photo", value: "PROFILE_PHOTO" },
      { label: "User Name", value: "USER_NAME" },
    ],
  },
};

export default function ModerationList() {
  const controller = useFilterController();
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [selectedAction, setSelectedAction] = useState<ModerationAction | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useModerationQueue({
    status: (controller.applied.status as string) || "",
    contentType: (controller.applied.contentType as string) || "",
    page,
    limit,
  });

  const items = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? items.length;

  const handleAction = (item: ModerationItem, action: ModerationAction) => {
    setSelectedItem(item);
    setSelectedAction(action);
    setIsActionOpen(true);
  };

  const columns = useMemo(() => getModerationColumns({ onAction: handleAction }), []);

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  const pendingCount = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Content Moderation & Review Queue
          </h2>
          {pendingCount > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
              {pendingCount} Pending
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Total
          </span>
        </div>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={items}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <ModerationActionDialog
        open={isActionOpen}
        onOpenChange={(open) => {
          setIsActionOpen(open);
          if (!open) {
            setSelectedItem(null);
            setSelectedAction(null);
          }
        }}
        item={selectedItem}
        action={selectedAction}
      />
    </div>
  );
}
