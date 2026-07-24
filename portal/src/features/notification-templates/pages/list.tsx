import { useMemo, useState } from "react";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getNotificationTemplateColumns } from "../components/column";
import { NotificationTemplateFormDialog, PreviewTemplateDialog } from "../components/dialog";
import { useNotificationTemplates, useSetNotificationTemplateActive } from "../hooks";
import type { NotificationTemplate, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  channel: {
    label: "Channel",
    operator: "equals",
    type: "select",
    field: "channel",
    placeholder: "All Channels",
    options: [
      { label: "Push", value: "push" },
      { label: "Message (SMS)", value: "sms" },
      { label: "Notification (Email)", value: "email" },
    ],
  },
  isActive: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "isActive",
    placeholder: "All Statuses",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
};

function toBool(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default function NotificationTemplateList() {
  const controller = useFilterController({ page: 1, limit: 10 });
  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const [selected, setSelected] = useState<NotificationTemplate | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data, isLoading, isFetching } = useNotificationTemplates({
    page, limit,
    channel: (controller.applied.channel as any) || "",
    isActive: toBool(controller.applied.isActive),
  });
  const templates = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? templates.length;

  const setActiveMutation = useSetNotificationTemplateActive();

  const handleOpenCreate = () => {
    setMode("create");
    setSelected(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (template: NotificationTemplate) => {
    setMode("edit");
    setSelected(template);
    setIsFormOpen(true);
  };

  const handleOpenPreview = (template: NotificationTemplate) => {
    setSelected(template);
    setIsPreviewOpen(true);
  };

  const handleToggleActive = (template: NotificationTemplate) => {
    setActiveMutation.mutate({ id: template.id, isActive: !template.isActive });
  };

  const columns = useMemo(
    () => getNotificationTemplateColumns({ onEdit: handleOpenEdit, onPreview: handleOpenPreview, onToggleActive: handleToggleActive }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Notifications &amp; Messages
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Total
          </span>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      <AutoFilters schema={FILTER_SCHEMA} controller={controller} isFetching={isLoading} compact className="border-none shadow-none bg-accent/20" />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={templates}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <NotificationTemplateFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} mode={mode} template={selected} />
      <PreviewTemplateDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} template={selected} />
    </div>
  );
}
