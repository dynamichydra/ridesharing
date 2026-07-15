import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";

import { getRideColumns } from "../components/column";
import { RideDetailsDialog } from "../components/dialog";
import { RideFilterForm } from "../components/filters";
import { useRideOffers, useRides, useRideTimeline } from "../hooks";
import type { Ride, RideListParams, Pagination } from "../types";
import type { RideFilterValues } from "../schema";

export default function RideList() {
  const [filters, setFilters] = useState<RideListParams>({ status: "" });
  const [page, setPage] = useState(1);

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data, isLoading } = useRides({ ...filters, page, limit: 10 });
  const { data: timeline, isLoading: timelineLoading } = useRideTimeline(selectedRide?.id);
  const { data: offers, isLoading: offersLoading } = useRideOffers(selectedRide?.id);

  const rides = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? rides.length;

  const handleApplyFilters = (values: RideFilterValues) => {
    setFilters({ status: values.status || "" });
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setPage(1);
  };

  const handleOpenDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setIsDetailsOpen(true);
  };

  const columns = useMemo(
    () => getRideColumns({ onViewDetails: handleOpenDetails }),
    []
  );

  const handlePageChange = (pageIndex: number) => {
    setPage(pageIndex + 1);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading rides…</div>;
  }

  return (
    <div className="space-y-4">
      <RideFilterForm
        defaultValues={{ status: (filters.status as RideFilterValues["status"]) || "" }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={rides}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
        />
      </div>

      <RideDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        ride={selectedRide}
        timeline={timeline}
        timelineLoading={timelineLoading}
        offers={offers}
        offersLoading={offersLoading}
      />
    </div>
  );
}
