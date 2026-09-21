import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getMismatchColumns } from "../components/mismatch-column";
import { ResolveMismatchDialog } from "../components/resolve-dialog";
import { useMismatches } from "../hooks";
import type { Mismatch, MismatchListParams, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Open", value: "open" },
      { label: "Resolved", value: "resolved" },
      { label: "Ignored", value: "ignored" },
    ],
  },
};

export default function MismatchesTab() {
  const controller = useFilterController();
  const [dialogTarget, setDialogTarget] = useState<Mismatch | null>(null);
  const [dialogIntent, setDialogIntent] = useState<"resolved" | "ignored" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useMismatches({
    runId: controller.applied.runId || undefined,
    status: (controller.applied.status as MismatchListParams["status"]) || "",
    page,
    limit,
  });

  const mismatches = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? mismatches.length;

  const handleResolve = (mismatch: Mismatch) => {
    setDialogTarget(mismatch);
    setDialogIntent("resolved");
    setIsDialogOpen(true);
  };

  const handleIgnore = (mismatch: Mismatch) => {
    setDialogTarget(mismatch);
    setDialogIntent("ignored");
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getMismatchColumns({ onResolve: handleResolve, onIgnore: handleIgnore }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Mismatches</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} findings.{" "}
            {controller.applied.runId ? "Filtered to one reconciliation run." : "Across all runs."}
          </p>
        </div>
        {controller.applied.runId && (
          <button
            type="button"
            className="text-xs text-primary hover:underline cursor-pointer"
            onClick={() => controller.apply({ runId: "", page: 1 })}
          >
            Clear run filter
          </button>
        )}
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
          data={mismatches}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <ResolveMismatchDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mismatch={dialogTarget}
        intent={dialogIntent}
      />
    </div>
  );
}
