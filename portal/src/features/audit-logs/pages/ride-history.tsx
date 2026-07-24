import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getRideStatusHistoryColumns } from "../components/ride-history-column";
import { useRideStatusHistory } from "../hooks";
import type { Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  rideId: {
    label: "Ride ID",
    operator: "equals",
    type: "text",
    field: "rideId",
    placeholder: "Filter to a specific ride",
  },
};

export default function RideHistoryTab() {
  const controller = useFilterController();
  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 20;

  const { data, isLoading, isFetching } = useRideStatusHistory({
    rideId: controller.applied.rideId || undefined,
    page,
    limit,
  });

  const entries = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? entries.length;

  const columns = useMemo(() => getRideStatusHistoryColumns(), []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Ride Status History</h3>
        <p className="text-xs text-muted-foreground">
          {totalRecords} status-change events across all rides. Ordered oldest-first — filter to
          a ride ID to see one ride's full lifecycle in order.
        </p>
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
          data={entries}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>
    </div>
  );
}
