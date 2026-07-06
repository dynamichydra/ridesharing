import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MapPin,
  Compass,
  Route,
  History,
  Info,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react";
import Loader from "@/components/fullpage-loader";

interface Ride {
  id: string;
  riderId: string;
  driverId: string | null;
  vehicleTypeId: string;
  pickupLat: string;
  pickupLng: string;
  pickupAddress: string | null;
  dropLat: string;
  dropLng: string;
  dropAddress: string | null;
  estimatedFare: string | null;
  finalFare: string | null;
  distanceKm: string | null;
  durationMin: number | null;
  status: string;
  cancelledBy: string | null;
  cancelReason: string | null;
  requestedAt: string;
}



interface TimelineEvent {
  id: string;
  rideId: string;
  status: string;
  latitude: string | null;
  longitude: string | null;
  note: string | null;
  createdAt: string;
}

interface Offer {
  id: string;
  rideId: string;
  driverId: string;
  driverName?: string;
  driverPhone?: string;
  score: string;
  status: string;
  createdAt: string;
}

export default function RideList() {
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch Rides
  const { data, isLoading } = useQuery({
    queryKey: ["rides", status, page],
    queryFn: () => {
      let url = `/rides?page=${page}&limit=10`;
      if (status) url += `&status=${status}`;
      return apiClient.get<Ride[]>(url);
    },
  });

  // Fetch Timeline logs for selected ride
  const { data: timeline, isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["ride-timeline", selectedRide?.id],
    queryFn: () =>
      apiClient.get<TimelineEvent[]>(`/rides/${selectedRide?.id}/history/admin`).then((res) => res.MESSAGE),
    enabled: !!selectedRide?.id,
  });

  // Fetch Offers logs for selected ride
  const { data: offers, isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ["ride-offers", selectedRide?.id],
    queryFn: () =>
      apiClient.get<Offer[]>(`/rides/${selectedRide?.id}/offers/admin`).then((res) => res.MESSAGE),
    enabled: !!selectedRide?.id,
  });

  if (isLoading) return <Loader />;

  const rides = data?.MESSAGE || [];
  const pagination = data?.PAGINATION;

  const handleOpenDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setIsDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "started":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Rides Management</h2>
        <p className="text-muted-foreground mt-1">Monitor active dispatches, routing details, and status update histories.</p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Dispatched Rides</CardTitle>
          <CardDescription>Grid overview of all ride transactions and telemetry logs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="searching">Searching</option>
              <option value="accepted">Accepted</option>
              <option value="arriving">Arriving</option>
              <option value="started">Started</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ride Details</th>
                  <th className="px-6 py-4 font-semibold">Pickup Address</th>
                  <th className="px-6 py-4 font-semibold">Drop Address</th>
                  <th className="px-6 py-4 font-semibold">Fare Metrics</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Telemetry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No rides matching search filters.
                    </td>
                  </tr>
                ) : (
                  rides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">ID: {ride.id.slice(0, 8)}...</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ride.requestedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate" title={ride.pickupAddress || ""}>
                        {ride.pickupAddress || `(${ride.pickupLat}, ${ride.pickupLng})`}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate" title={ride.dropAddress || ""}>
                        {ride.dropAddress || `(${ride.dropLat}, ${ride.dropLng})`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">Final: ₹{ride.finalFare || ride.estimatedFare || "—"}</div>
                        <div className="text-xs text-muted-foreground">Est: ₹{ride.estimatedFare || "—"} | {ride.distanceKm || "0"} km</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(ride.status)}`}>
                          {ride.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(ride)}
                          className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                        >
                          <Info className="h-3.5 w-3.5 mr-1" />
                          View Logs
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                  onClick={() => setPage(prev => prev - 1)}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                  className="cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details drawer/modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ride Telemetry Details</DialogTitle>
            <DialogDescription>
              Check the matching logs, driver broadcast history, and timeline.
            </DialogDescription>
          </DialogHeader>

          {selectedRide && (
            <div className="space-y-6 py-4">
              {/* Route segment */}
              <div className="border border-border p-4 rounded-lg bg-muted/20 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <Route className="h-4 w-4" /> Routing Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Pickup Address</span>
                      <span className="font-medium">{selectedRide.pickupAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Drop Address</span>
                      <span className="font-medium">{selectedRide.dropAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status details / Cancellation info */}
              {selectedRide.status === "cancelled" && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4 rounded-lg text-sm text-red-800 dark:text-red-400">
                  <h5 className="font-bold flex items-center gap-1.5 mb-1">
                    <X className="h-4 w-4" /> Cancellation Record
                  </h5>
                  <div><strong>Cancelled By:</strong> {selectedRide.cancelledBy || "Unknown"}</div>
                  <div><strong>Reason:</strong> {selectedRide.cancelReason || "No reason specified"}</div>
                </div>
              )}

              {/* Grid timeline & Broadcast history */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Status Timeline */}
                <div className="space-y-4 border border-border p-4 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-primary border-b border-border pb-2">
                    <History className="h-4 w-4" /> State Timeline
                  </h4>
                  {timelineLoading ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">Loading state logs...</div>
                  ) : !timeline || timeline.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">No events recorded.</div>
                  ) : (
                    <div className="space-y-4 relative pl-3 border-l border-border">
                      {timeline.map((event) => (
                        <div key={event.id} className="relative text-xs">
                          <div className="absolute -left-[17px] mt-0.5 h-2 w-2 rounded-full bg-primary" />
                          <div className="font-semibold text-foreground capitalize">{event.status}</div>
                          <div className="text-muted-foreground text-[10px]">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </div>
                          {event.note && (
                            <div className="text-[11px] text-muted-foreground italic mt-0.5">{event.note}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Offer Broadcasts */}
                <div className="space-y-4 border border-border p-4 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-primary border-b border-border pb-2">
                    <Compass className="h-4 w-4" /> Driver Bids/Offers
                  </h4>
                  {offersLoading ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">Loading broadcast matches...</div>
                  ) : !offers || offers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">No driver broadcast recorded.</div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {offers.map((offer) => (
                        <div key={offer.id} className="p-2 border border-border rounded bg-muted/10 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-foreground">Driver ID: {offer.driverId.slice(0, 8)}...</div>
                            <div className="text-[10px] text-muted-foreground">Match Score: {parseFloat(offer.score).toFixed(2)}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              offer.status === "accepted"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30"
                                : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800"
                            }`}
                          >
                            {offer.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
