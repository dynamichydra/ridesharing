import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListFilter, Users, ArrowRight } from "lucide-react";
import type { DispatchQueueItem } from "../types";

interface DispatchQueueCardProps {
  items?: DispatchQueueItem[];
  isLoading?: boolean;
}

export function DispatchQueueCard({ items = [] }: DispatchQueueCardProps) {
  const pendingCount = items.length;

  return (
    <Card className="border-border bg-card shadow-sm flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold text-foreground">
            Dispatch Queue
          </CardTitle>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
          {pendingCount > 0 ? `${pendingCount} Pending` : "Queue Idle"}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 flex-1 overflow-y-auto max-h-[280px] space-y-3.5">
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No pending dispatch requests at this time.
          </div>
        ) : (
          items.map((item) => {
            const isSearching = item.status === "searching" || item.status === "requested";
            const isHighWait = item.waitingMinutes > 8;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
                    <span>{item.pickupAddress}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{item.dropAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">Req: {item.vehicleTypeName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.passengerCount || 1} {item.passengerCount === 1 ? "passenger" : "passengers"}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-bold ${
                      isHighWait ? "text-destructive" : "text-primary"
                    }`}
                  >
                    ETA: {item.etaMinutes} min
                  </div>
                  <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                    {isSearching ? "Searching..." : "Assigning..."}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
