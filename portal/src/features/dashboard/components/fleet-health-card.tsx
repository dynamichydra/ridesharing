import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatteryCharging, ShieldCheck, AlertOctagon, Wrench } from "lucide-react";
import type { FleetHealth } from "../types";

interface FleetHealthCardProps {
  health?: FleetHealth;
  isLoading?: boolean;
}

export function FleetHealthCard({ health }: FleetHealthCardProps) {
  const batteryPct = health?.batteryOptimalPct ?? 100;
  const tirePct = health?.tireNormalPct ?? 100;
  const inspectionPct = health?.inspectionOptimalPct ?? 100;
  const alertsCount = health?.activeAlerts ?? 0;

  return (
    <Card className="border-border bg-card shadow-sm flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold text-foreground">
            Active Fleet Health
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Battery / Fuel */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border flex flex-col justify-between text-center">
          <div className="flex flex-col items-center">
            <BatteryCharging className="h-7 w-7 text-primary mb-1.5" />
            <div className="font-semibold text-xs text-foreground">Battery / Fuel</div>
            <div className="text-xs text-muted-foreground mt-0.5">{batteryPct}% Optimal</div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${batteryPct}%` }}
            />
          </div>
        </div>

        {/* Tire Pressure / Safety */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border flex flex-col justify-between text-center">
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-7 w-7 text-primary mb-1.5" />
            <div className="font-semibold text-xs text-foreground">Safety Systems</div>
            <div className="text-xs text-muted-foreground mt-0.5">{tirePct}% Normal</div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${tirePct}%` }}
            />
          </div>
        </div>

        {/* Inspections / Engine Status */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border flex flex-col justify-between text-center">
          <div className="flex flex-col items-center">
            {alertsCount > 0 ? (
              <AlertOctagon className="h-7 w-7 text-destructive mb-1.5" />
            ) : (
              <Wrench className="h-7 w-7 text-primary mb-1.5" />
            )}
            <div className="font-semibold text-xs text-foreground">Inspection Status</div>
            <div
              className={`text-xs mt-0.5 ${
                alertsCount > 0 ? "text-destructive font-semibold" : "text-muted-foreground"
              }`}
            >
              {alertsCount > 0 ? `${alertsCount} Alerts` : `${inspectionPct}% Certified`}
            </div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`${
                alertsCount > 0 ? "bg-destructive" : "bg-primary"
              } h-full transition-all duration-500 rounded-full`}
              style={{ width: `${alertsCount > 0 ? 30 : inspectionPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
