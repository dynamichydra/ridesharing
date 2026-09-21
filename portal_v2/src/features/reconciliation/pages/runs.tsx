import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getRunColumns } from "../components/run-column";
import { useReconciliationRuns } from "../hooks";
import type { ReconciliationRun, ReconciliationRunListParams, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  gateway: {
    label: "Gateway",
    operator: "equals",
    type: "select",
    field: "gateway",
    placeholder: "All Gateways",
    options: [
      { label: "Razorpay", value: "razorpay" },
      { label: "Stripe", value: "stripe" },
    ],
  },
};

interface Props {
  onViewMismatches: (run: ReconciliationRun) => void;
}

export default function RunsTab({ onViewMismatches }: Props) {
  const controller = useFilterController();

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useReconciliationRuns({
    gateway: (controller.applied.gateway as ReconciliationRunListParams["gateway"]) || "",
    page,
    limit,
  });

  const runs = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? runs.length;

  const columns = useMemo(() => getRunColumns({ onViewMismatches }), []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Reconciliation Runs</h3>
        <p className="text-xs text-muted-foreground">
          {totalRecords} runs — produced automatically by the scheduled reconciliation job, one
          per gateway per window. Diffs our payment records against the processor's own records.
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
          data={runs}
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
