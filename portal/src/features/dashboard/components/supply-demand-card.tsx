import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles } from "lucide-react";
import type { SupplyDemandResponse } from "../types";

interface SupplyDemandCardProps {
  data?: SupplyDemandResponse;
  isLoading?: boolean;
}

export function SupplyDemandCard({ data }: SupplyDemandCardProps) {
  const score = data?.marketEquilibriumScore ?? 88;
  const statusLabel = data?.statusLabel ?? "Balanced";
  const summaryMessage =
    data?.summaryMessage ??
    "System is currently operating at high efficiency. 3 zones require immediate rebalancing.";

  const zones = data?.zones || [
    { zoneId: "z1", zoneName: "Downtown Central", supplyPct: 45, demandPct: 55, gapLabel: "+10% Gap", isSurplus: false },
    { zoneId: "z2", zoneName: "Airport Corridor", supplyPct: 70, demandPct: 30, gapLabel: "Surplus", isSurplus: true },
    { zoneId: "z3", zoneName: "Financial District", supplyPct: 35, demandPct: 65, gapLabel: "+30% Gap", isSurplus: false },
  ];

  return (
    <Card className="border-border bg-card shadow-sm flex flex-col">
      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">
            Supply & Demand Analysis
          </CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Market Equilibrium:</span>
            <span className="font-bold text-primary">{score}%</span>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Zone Breakdown (2 cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Zone</span>
            <div className="flex gap-6">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                Supply
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                Demand
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {zones.map((z) => (
              <div key={z.zoneId} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground w-28 sm:w-36 truncate">
                  {z.zoneName}
                </span>
                <div className="flex-1 flex h-5 rounded-md overflow-hidden bg-secondary">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${z.supplyPct}%` }}
                    title={`Supply: ${z.supplyPct}%`}
                  />
                  <div
                    className="bg-destructive/80 h-full transition-all duration-500"
                    style={{ width: `${z.demandPct}%` }}
                    title={`Demand: ${z.demandPct}%`}
                  />
                </div>
                <span
                  className={`w-16 text-right font-semibold ${
                    z.isSurplus ? "text-primary" : "text-destructive"
                  }`}
                >
                  {z.gapLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Circular Equilibrium Score Gauge (1 col) */}
        <div className="bg-muted/30 rounded-xl p-4 flex flex-col justify-center items-center text-center border border-border">
          <div className="relative w-20 h-20 flex items-center justify-center mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                className="stroke-secondary"
                cx="18"
                cy="18"
                fill="none"
                r="16"
                strokeWidth="3"
              />
              <circle
                className="stroke-primary"
                cx="18"
                cy="18"
                fill="none"
                r="16"
                strokeDasharray={`${score}, 100`}
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{score}%</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Score</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-2 line-clamp-2">
            {summaryMessage}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 h-7"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Auto-Rebalance Fleet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
