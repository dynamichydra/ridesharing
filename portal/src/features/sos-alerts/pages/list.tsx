import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getSosAlertColumns } from "../components/column";
import { ResolveSosDialog } from "../components/dialog";
import { useSosAlerts } from "../hooks";
import type { SosAlert, SosAlertListParams } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Active SOS", value: "TRIGGERED" },
      { label: "Resolved", value: "RESOLVED" },
    ],
  },
  userType: {
    label: "Initiator",
    operator: "equals",
    type: "select",
    field: "userType",
    placeholder: "All Initiators",
    options: [
      { label: "Rider", value: "RIDER" },
      { label: "Driver", value: "DRIVER" },
    ],
  },
};

export default function SosAlertList() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SosAlert | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useSosAlerts({
    status: (controller.applied.status as SosAlertListParams["status"]) || "",
    userType: (controller.applied.userType as SosAlertListParams["userType"]) || "",
    page,
    limit,
  });

  const alerts = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? alerts.length;

  const handleResolve = (alert: SosAlert) => {
    setSelectedAlert(alert);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getSosAlertColumns({ onResolve: handleResolve }), []);

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  const activeCount = alerts.filter((a) => a.status === "TRIGGERED").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-destructive/10 p-1.5 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Emergency SOS & Safety Center
          </h2>
          {activeCount > 0 && (
            <span className="text-xs font-bold text-destructive-foreground bg-destructive px-2.5 py-0.5 rounded-full animate-bounce">
              {activeCount} ACTIVE SOS
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
          data={alerts}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <ResolveSosDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedAlert(null);
        }}
        alertToResolve={selectedAlert}
      />
    </div>
  );
}
