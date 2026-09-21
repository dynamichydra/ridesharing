import { useMemo, useState } from "react";
import { AlertOctagon } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getFlaggedTripColumns } from "../components/column";
import { ApproveFlaggedTripDialog } from "../components/approve-dialog";
import { AdjustFlaggedTripDialog } from "../components/adjust-dialog";
import { useFlaggedTrips } from "../hooks";
import type { FlaggedTrip, FlaggedTripListParams, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Pending Review", value: "pending_review" },
      { label: "Approved", value: "approved" },
      { label: "Adjusted", value: "adjusted" },
    ],
  },
};

export default function FlaggedTripList() {
  const controller = useFilterController({ status: "pending_review" });
  const [approveTarget, setApproveTarget] = useState<FlaggedTrip | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<FlaggedTrip | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useFlaggedTrips({
    status: (controller.applied.status as FlaggedTripListParams["status"]) || "",
    page,
    limit,
  });

  const trips = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? trips.length;

  const handleApprove = (trip: FlaggedTrip) => {
    setApproveTarget(trip);
    setIsApproveOpen(true);
  };

  const handleAdjust = (trip: FlaggedTrip) => {
    setAdjustTarget(trip);
    setIsAdjustOpen(true);
  };

  const columns = useMemo(() => getFlaggedTripColumns({ onApprove: handleApprove, onAdjust: handleAdjust }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <AlertOctagon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Flagged Trips
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
          data={trips}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <ApproveFlaggedTripDialog open={isApproveOpen} onOpenChange={setIsApproveOpen} trip={approveTarget} />
      <AdjustFlaggedTripDialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen} trip={adjustTarget} />
    </div>
  );
}
