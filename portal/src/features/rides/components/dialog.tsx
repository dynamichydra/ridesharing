import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Compass, History, MapPin, Route, X } from "lucide-react";
import type { Ride, RideOffer, RideTimelineEvent } from "../types";

interface RideDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ride: Ride | null;
  timeline?: RideTimelineEvent[];
  timelineLoading: boolean;
  offers?: RideOffer[];
  offersLoading: boolean;
}

export function RideDetailsDialog({
  open,
  onOpenChange,
  ride,
  timeline,
  timelineLoading,
  offers,
  offersLoading,
}: RideDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ride Telemetry Details</DialogTitle>
          <DialogDescription>
            Check the matching logs, driver broadcast history, and timeline.
          </DialogDescription>
        </DialogHeader>

        {ride && (
          <div className="space-y-6 py-4">
            <div className="border border-border p-4 rounded-lg bg-muted/20 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <Route className="h-4 w-4" /> Routing Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Pickup Address</span>
                    <span className="font-medium">{ride.pickupAddress}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Drop Address</span>
                    <span className="font-medium">{ride.dropAddress}</span>
                  </div>
                </div>
              </div>
            </div>

            {ride.status === "cancelled" && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4 rounded-lg text-sm text-red-800 dark:text-red-400">
                <h5 className="font-bold flex items-center gap-1.5 mb-1">
                  <X className="h-4 w-4" /> Cancellation Record
                </h5>
                <div>
                  <strong>Cancelled By:</strong> {ride.cancelledBy || "Unknown"}
                </div>
                <div>
                  <strong>Reason:</strong> {ride.cancelReason || "No reason specified"}
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
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
                      <div
                        key={offer.id}
                        className="p-2 border border-border rounded bg-muted/10 text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-foreground">
                            Driver ID: {offer.driverId.slice(0, 8)}...
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Match Score: {parseFloat(offer.score).toFixed(2)}
                          </div>
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
  );
}
