import { useMemo, useState } from "react";
import { Car, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import {
  AutoFilters,
  type FilterSchema,
} from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getRideColumns } from "../components/column";
import { RideDetailsDialog } from "../components/dialog";
import { useCancelRideAdmin, useExportRides, useRideOffers, useRides, useRideTimeline } from "../hooks";
import { rideStatusOptions } from "../schema";
import type { Ride, Pagination } from "../types";
import { RidePaymentHistoryDialog } from "@/features/ride-payments/components/history-dialog";
import { useDownloadRideInvoice } from "@/features/ride-payments/hooks";
import { useCountryOptions } from "@/features/geo/hooks";

const BASE_FILTER_SCHEMA: FilterSchema = {
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

  // Rides only carry a country (resolved from the pickup point) — no state/city — so this
  // is a single-level country filter, not the full cascading useGeoFilterSchema.
  const { data: countriesData } = useCountryOptions();
  const FILTER_SCHEMA: FilterSchema = {
    ...BASE_FILTER_SCHEMA,
    countryId: {
      label: "Country",
      operator: "equals",
      type: "select",
      field: "countryId",
      placeholder: "All Countries",
      options: (countriesData?.MESSAGE ?? []).map((c) => ({ label: c.name, value: c.id })),
    },
  };

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [paymentsRideId, setPaymentsRideId] = useState<string | null>(null);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useRides({
    status: (controller.applied.status as Ride["status"]) || "",
    page,
    limit,
    countryId: controller.applied.countryId || undefined,
    // Not shown in the visible filter bar — read from the URL so the "View all rides" deep
    // link from a rider/driver's detail page (?riderId=/?driverId=) pre-filters this list.
    riderId: controller.applied.riderId || undefined,
    driverId: controller.applied.driverId || undefined,
  });
  const { data: timeline, isLoading: timelineLoading } = useRideTimeline(selectedRide?.id);
  const { data: offers, isLoading: offersLoading } = useRideOffers(selectedRide?.id);
  const cancelMutation = useCancelRideAdmin();
  const exportMutation = useExportRides();
  const downloadInvoiceMutation = useDownloadRideInvoice();

  const rides = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? rides.length;

  const handleOpenDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setIsDetailsOpen(true);
  };

  const handleViewPayments = (ride: Ride) => {
    setPaymentsRideId(ride.id);
    setIsPaymentsOpen(true);
  };

  const handleDownloadInvoice = (ride: Ride) => {
    downloadInvoiceMutation.mutate(ride.id);
  };

  const handleExport = () => {
    exportMutation.mutate(
      { status: (controller.applied.status as Ride["status"]) || "" },
      {
        onSuccess: (res) => {
          downloadCsv(`rides-${Date.now()}.csv`, res.MESSAGE ?? [], [
            { header: "ID", accessor: (r: Ride) => r.id },
            { header: "Status", accessor: (r: Ride) => r.status },
            { header: "Pickup Address", accessor: (r: Ride) => r.pickupAddress },
            { header: "Drop Address", accessor: (r: Ride) => r.dropAddress },
            { header: "Estimated Fare", accessor: (r: Ride) => r.estimatedFare },
            { header: "Final Fare", accessor: (r: Ride) => r.finalFare },
            { header: "Distance (km)", accessor: (r: Ride) => r.distanceKm },
            { header: "Cancelled By", accessor: (r: Ride) => r.cancelledBy },
            { header: "Cancel Reason", accessor: (r: Ride) => r.cancelReason },
            { header: "Requested At", accessor: (r: Ride) => r.requestedAt },
          ]);
        },
      },
    );
  };

  const handleCancelRide = (reason: string) => {
    if (!selectedRide) return;
    cancelMutation.mutate(
      { rideId: selectedRide.id, reason },
      { onSuccess: () => setIsDetailsOpen(false) },
    );
  };

  const columns = useMemo(
    () =>
      getRideColumns({
        onViewDetails: handleOpenDetails,
        onViewPayments: handleViewPayments,
        onDownloadInvoice: handleDownloadInvoice,
      }),
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
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
          disabled={exportMutation.isPending}
          className="gap-2 h-8"
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
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
        onCancelRide={handleCancelRide}
        isCancelling={cancelMutation.isPending}
      />

      <RidePaymentHistoryDialog
        open={isPaymentsOpen}
        onOpenChange={setIsPaymentsOpen}
        rideId={paymentsRideId}
      />
    </div>
  );
}
