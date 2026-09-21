import { useMemo } from "react";
import { ScrollText } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import {
  AutoFilters,
  type FilterSchema,
} from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getAuditLogColumns } from "../components/column";
import { useAuditLogs } from "../hooks";
import type { Pagination } from "../types";

const ACTION_OPTIONS = [
  "DRIVER_APPROVED",
  "DRIVER_REJECTED",
  "DRIVER_BLOCKED",
  "DRIVER_UNBLOCKED",
  "DOCUMENTS_REQUESTED",
  "DOCUMENT_APPROVED",
  "DOCUMENT_REJECTED",
  "VEHICLE_TYPE_ENABLED",
  "VEHICLE_TYPE_DISABLED",
  "ZONE_ENABLED",
  "ZONE_DISABLED",
  "FARE_RULE_ENABLED",
  "FARE_RULE_DISABLED",
  "SUBSCRIPTION_PLAN_ENABLED",
  "SUBSCRIPTION_PLAN_DISABLED",
  "RIDE_CANCELLED_BY_ADMIN",
  "REGISTRATION_SUBMITTED",
  "DOCUMENTS_SUBMITTED",
];

const FILTER_SCHEMA: FilterSchema = {
  actorType: {
    label: "Actor",
    operator: "equals",
    type: "select",
    field: "actorType",
    placeholder: "All Actors",
    options: [
      { label: "Admin", value: "admin" },
      { label: "Driver", value: "driver" },
      { label: "Rider", value: "rider" },
      { label: "System", value: "system" },
    ],
  },
  action: {
    label: "Action",
    operator: "equals",
    type: "select",
    field: "action",
    placeholder: "All Actions",
    options: ACTION_OPTIONS.map((action) => ({
      label: action.replace(/_/g, " "),
      value: action,
    })),
  },
};

export default function AuditLogList() {
  const controller = useFilterController();

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 20;

  const { data, isLoading, isFetching } = useAuditLogs({
    actorType: controller.applied.actorType || undefined,
    action: controller.applied.action || undefined,
    page,
    limit,
  });

  const logs = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? logs.length;

  const columns = useMemo(() => getAuditLogColumns(), []);

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <ScrollText className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Audit Log
          </h2>
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
          data={logs}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>
    </div>
  );
}
