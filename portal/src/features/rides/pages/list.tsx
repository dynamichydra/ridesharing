import { useMemo, useState } from "react";
import { Car } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import {
  AutoFilters,
  type FilterSchema,
} from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getRideColumns } from "../components/column";
import { RideDetailsDialog } from "../components/dialog";
import { useRideOffers, useRides, useRideTimeline } from "../hooks";
import { rideStatusOptions } from "../schema";
import type { Ride, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: rideStatusOptions.map((status) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: status,
    })),
  },
};

export default function RideList() {
  const controller = useFilterController();

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useRides({
    status: (controller.applied.status as Ride["status"]) || "",
    page,
    limit,
  });
  const { data: timeline, isLoading: timelineLoading } = useRideTimeline(selectedRide?.id);
  const { data: offers, isLoading: offersLoading } = useRideOffers(selectedRide?.id);

  const rides = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? rides.length;

  const handleOpenDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setIsDetailsOpen(true);
  };

  const columns = useMemo(
    () => getRideColumns({ onViewDetails: handleOpenDetails }),
    []
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Rides
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
          data={rides}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
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
