import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, Radio } from "lucide-react";
import type { LiveMonitoringResponse } from "../types";

interface LiveMonitoringCardProps {
  data?: LiveMonitoringResponse;
  isLoading?: boolean;
}

export function LiveMonitoringCard({ data }: LiveMonitoringCardProps) {
  const alerts = data?.alerts || [
    {
      id: "mock-alt-1",
      type: "deviation",
      title: "Driver Off Route",
      message: "Ride #4492 deviated significantly from planned route.",
      severity: "warning",
      createdAt: new Date(),
    },
    {
      id: "mock-alt-2",
      type: "surge",
      title: "High Demand Zone",
      message: "Surge pricing active downtown (1.4x multiplier).",
      severity: "info",
      createdAt: new Date(),
    },
  ];

  const eventLogs = data?.eventLogs || [
    { id: "e1", time: "10:42", text: "Ride #123 started", level: "primary" },
    { id: "e2", time: "10:41", text: "Driver Sarah online", level: "primary" },
    { id: "e3", time: "10:39", text: "Ride #119 completed", level: "success" },
    { id: "e4", time: "10:37", text: "New request in Zone B", level: "info" },
    { id: "e5", time: "10:35", text: "Driver Mike offline (shift ended)", level: "neutral" },
    { id: "e6", time: "10:32", text: "Ride #122 started", level: "primary" },
    { id: "e7", time: "10:30", text: "Ride #121 assigned", level: "primary" },
  ];

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
          {alerts.slice(0, 2).map((alert) => {
            const isEmergency = alert.severity === "critical";
            const isSurge = alert.type === "surge";

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                  isEmergency
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : isSurge
                    ? "bg-primary/10 border-primary/20 text-foreground"
                    : "bg-amber-500/10 border-amber-500/20 text-foreground"
                }`}
              >
                {isEmergency ? (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : isSurge ? (
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Scrolling Event Feed */}
        <div className="p-3 flex-1 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Telemetry Stream
          </p>
          <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1">
            {eventLogs.map((log) => {
              let dotColor = "bg-primary";

              if (log.level === "success") {
                dotColor = "bg-green-500";
              } else if (log.level === "error") {
                dotColor = "bg-destructive";
              } else if (log.level === "neutral") {
                dotColor = "bg-muted-foreground";
              }

              return (
                <div key={log.id} className="flex items-center gap-2.5 text-xs">
                  <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`} />
                  <span className="font-mono text-muted-foreground w-12 text-[11px]">
                    {log.time}
                  </span>
                  <span className="text-foreground truncate flex-1 font-medium">
                    {log.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
