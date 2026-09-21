import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles, MapPin } from "lucide-react";
import type { SupplyDemandResponse } from "../types";

interface SupplyDemandCardProps {
  data?: SupplyDemandResponse;
  isLoading?: boolean;
}

export function SupplyDemandCard({ data }: SupplyDemandCardProps) {
  const score = data?.marketEquilibriumScore ?? 100;
  const statusLabel = data?.statusLabel ?? (score >= 75 ? "Balanced" : "Attention Required");
  const summaryMessage =
    data?.summaryMessage ??
    "System is operating across active service zones.";

  const zones = data?.zones || [];

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

          {zones.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
              <MapPin className="h-5 w-5 text-muted-foreground/60" />
              <p>No service zones configured in the system yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((z) => (
                <div key={z.zoneId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground w-28 sm:w-36 truncate">
                    {z.zoneName}
                  </span>

                  {/* Dual split progress bar */}
                  <div className="flex-1 bg-muted h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${z.supplyPct}%` }}
                      title={`Supply: ${z.supplyPct}%`}
                    />
                    <div
                      className="bg-destructive h-full transition-all duration-300"
                      style={{ width: `${z.demandPct}%` }}
                      title={`Demand: ${z.demandPct}%`}
                    />
                  </div>

                  <span
                    className={`font-semibold shrink-0 text-right w-16 ${
                      z.isSurplus ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {z.gapLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Market Equilibrium Score & Auto Dispatcher (1 col) */}
        <div className="md:col-span-1 bg-muted/30 border border-border rounded-xl p-4 flex flex-col items-center justify-between text-center space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Market Equilibrium Score
            </p>
            <div className="text-4xl font-extrabold text-foreground mt-2">
              {score}
              <span className="text-lg font-normal text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
              {summaryMessage}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-9 bg-card border-border hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary group-hover:text-primary-foreground" />
            Auto-Rebalance Fleet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
