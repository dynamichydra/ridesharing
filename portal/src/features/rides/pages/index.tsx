import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/fullpage-loader";
import { useRideOffers, useRides, useRideTimeline } from "../hooks";
import { getRideColumns } from "../column";
import { RideFilterForm } from "../form";
import { RideDetailsDialog } from "../dialog";
import type { Ride, RideListParams } from "../types";
import type { RideFilterValues } from "../schema";

export default function RideList() {
  const [filters, setFilters] = useState<RideListParams>({ status: "" });
  const [page, setPage] = useState(1);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data, isLoading } = useRides({ ...filters, page, limit: 10 });
  const { data: timeline, isLoading: timelineLoading } = useRideTimeline(selectedRide?.id);
  const { data: offers, isLoading: offersLoading } = useRideOffers(selectedRide?.id);

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

  if (isLoading) return <Loader />;

  const rides = data?.data ?? [];
  const pagination = data?.pagination;
  const columns = getRideColumns(handleOpenDetails);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Rides Management</h2>
        <p className="text-muted-foreground mt-1">
          Monitor active dispatches, routing details, and status update histories.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Dispatched Rides</CardTitle>
          <CardDescription>Grid overview of all ride transactions and telemetry logs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RideFilterForm
            defaultValues={{ status: (filters.status as RideFilterValues["status"]) || "" }}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />

          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={`px-6 py-4 font-semibold ${col.className ?? ""}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                      No rides matching search filters.
                    </td>
                  </tr>
                ) : (
                  rides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-6 py-4">
                          {col.render(ride)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Showing Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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