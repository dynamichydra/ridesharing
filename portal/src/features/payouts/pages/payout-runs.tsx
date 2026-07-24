import { useMemo, useState } from "react";
import { Zap, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getPayoutColumns, getPayoutBatchColumns } from "../components/payout-column";
import { InstantPayoutDialog } from "../components/instant-payout-dialog";
import { usePayouts, usePayoutBatches, useTriggerPayoutBatch } from "../hooks";
import type { PayoutListParams, PayoutBatch, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  driverId: {
    label: "Driver ID",
    operator: "equals",
    type: "text",
    field: "driverId",
    placeholder: "Search by driver ID",
  },
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Processing", value: "processing" },
      { label: "Completed", value: "completed" },
      { label: "Failed", value: "failed" },
    ],
  },
};

export default function PayoutRunsTab() {
  const controller = useFilterController();
  const [isInstantOpen, setIsInstantOpen] = useState(false);
  const [batchesPage, setBatchesPage] = useState(1);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = usePayouts({
    driverId: controller.applied.driverId || undefined,
    status: (controller.applied.status as PayoutListParams["status"]) || "",
    batchId: controller.applied.batchId || undefined,
    page,
    limit,
  });
  const { data: batchesData, isLoading: batchesLoading } = usePayoutBatches(batchesPage, 5);
  const triggerBatchMutation = useTriggerPayoutBatch();

  const payouts = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? payouts.length;

  const batches = batchesData?.MESSAGE || [];
  const batchesPagination = batchesData?.PAGINATION as unknown as Pagination | undefined;

  const handleViewPayouts = (batch: PayoutBatch) => {
    controller.apply({ batchId: batch.id, page: 1 });
  };

  const payoutColumns = useMemo(() => getPayoutColumns(), []);
  const batchColumns = useMemo(() => getPayoutBatchColumns({ onViewPayouts: handleViewPayouts }), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Payout Runs</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} payout attempts. Batches run automatically on a weekly schedule —
            these actions trigger one on demand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2 cursor-pointer" onClick={() => setIsInstantOpen(true)}>
            <Zap className="h-3.5 w-3.5" /> Instant Payout
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 cursor-pointer"
            disabled={triggerBatchMutation.isPending}
            onClick={() => triggerBatchMutation.mutate("stripe")}
          >
            <PlayCircle className="h-3.5 w-3.5" /> Run Stripe Batch
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 cursor-pointer"
            disabled={triggerBatchMutation.isPending}
            onClick={() => triggerBatchMutation.mutate("razorpay")}
          >
            <PlayCircle className="h-3.5 w-3.5" /> Run Razorpay Batch
          </Button>
        </div>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      {controller.applied.batchId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Filtered to batch <span className="font-mono">{controller.applied.batchId.slice(0, 8)}...</span>
          <button
            type="button"
            className="text-primary hover:underline cursor-pointer"
            onClick={() => controller.apply({ batchId: "", page: 1 })}
          >
            Clear
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={payoutColumns}
          data={payouts}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Batches</h4>
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <DataTable
            columns={batchColumns}
            data={batches}
            pageIndex={batchesPage - 1}
            pageSize={5}
            pageCount={batchesPagination?.totalPages || 1}
            onPageChange={(pageIndex) => setBatchesPage(pageIndex + 1)}
            isLoading={batchesLoading}
            isFetching={batchesLoading}
          />
        </div>
      </div>

      <InstantPayoutDialog open={isInstantOpen} onOpenChange={setIsInstantOpen} />
    </div>
  );
}
