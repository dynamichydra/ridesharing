import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Radio, CheckCircle2 } from "lucide-react";
import type { LiveMonitoringResponse } from "../types";

interface LiveMonitoringCardProps {
  data?: LiveMonitoringResponse;
  isLoading?: boolean;
}

export function LiveMonitoringCard({ data }: LiveMonitoringCardProps) {
  const alerts = data?.alerts || [];
  const eventLogs = data?.eventLogs || [];

  return (
    <Card className="border-border bg-card shadow-sm flex flex-col h-full overflow-hidden">
      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary animate-pulse" />
          <CardTitle className="text-base font-semibold text-foreground">
            Live Monitoring Console
          </CardTitle>
        </div>
        <Badge variant="secondary" className="text-xs">
          Real-Time
        </Badge>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col divide-y divide-border">
        {/* Sticky High Priority Alerts */}
        <div className="p-3 space-y-2 bg-muted/20">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Active Alerts
          </p>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-3 bg-card rounded-md border border-border">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>No critical alerts. All operations running smoothly.</span>
            </div>
          ) : (
            alerts.map((alt) => {
              const isCrit = alt.severity === "critical";
              return (
                <div
                  key={alt.id}
                  className={`p-2.5 rounded-md border flex items-start gap-2.5 text-xs transition-colors ${
                    isCrit
                      ? "bg-destructive/10 border-destructive/30 text-destructive dark:text-red-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{alt.title}</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{alt.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Scrolling Activity Event Stream */}
        <div className="p-3 flex-1 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
            Telemetry Stream
          </p>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px] pr-1 text-xs">
            {eventLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No recent telemetry events recorded.
              </p>
            ) : (
              eventLogs.map((ev) => {
                let badgeColor = "bg-muted text-muted-foreground";
                if (ev.level === "primary") badgeColor = "bg-primary/10 text-primary";
                if (ev.level === "success") badgeColor = "bg-primary/15 text-primary font-medium";
                if (ev.level === "error") badgeColor = "bg-destructive/10 text-destructive";

                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/40 transition-colors border border-transparent hover:border-border/50"
                  >
                    <span className="text-muted-foreground text-[11px] font-mono shrink-0">
                      {ev.time}
                    </span>
                    <span className="truncate mx-2 text-foreground font-medium flex-1">
                      {ev.text}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 uppercase font-semibold ${badgeColor}`}>
                      {ev.level || "event"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
