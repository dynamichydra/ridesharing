import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, RefreshCw } from "lucide-react";
import {
  useDashboardOverview,
  useDispatchQueue,
  useLiveMonitoring,
  useSupplyDemandAnalytics,
  useRecentActivity,
  useLiveFleetMap,
  useDashboardSocket,
} from "../hooks";
import { KPICardsGrid } from "../cards";
import { LiveMapCard } from "../components/live-map-card";
import { LiveMonitoringCard } from "../components/live-monitoring-card";
import { DispatchQueueCard } from "../components/dispatch-queue-card";
import { FleetHealthCard } from "../components/fleet-health-card";
import { SupplyDemandCard } from "../components/supply-demand-card";
import EarningsTrendChart from "../chart";
import { RecentActivityCard } from "../components/recent-activity-card";

export default function DashboardPage() {
  const { isConnected, requestRefresh } = useDashboardSocket();
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useDashboardOverview();
  const { data: queueItems = [], isLoading: queueLoading } = useDispatchQueue();
  const { data: monitoringData, isLoading: monitoringLoading } = useLiveMonitoring();
  const { data: supplyDemandData, isLoading: supplyDemandLoading } = useSupplyDemandAnalytics();
  const { data: recentActivity = [], isLoading: activityLoading } = useRecentActivity();
  const { data: fleetMapData, isLoading: mapLoading } = useLiveFleetMap();

  const handleRefreshAll = () => {
    requestRefresh();
    refetchOverview();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Fleet Monitor & Dispatch Center
            </h1>
            <Badge
              variant="outline"
              className={`text-xs hidden sm:inline-flex items-center gap-1.5 ${
                isConnected
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground"
                }`}
              />
              {isConnected ? "Socket Live" : "Connecting…"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time socket telemetry, active driver dispatch, and zone market equilibrium.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="text-xs h-9 border-border bg-card hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Sync Now
          </Button>
          <Button
            size="sm"
            className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Quick Dispatch
          </Button>
        </div>
      </div>

      {/* Section 1: KPI Summary Cards */}
      <KPICardsGrid data={overview} />

      {/* Section 2: Live Dispatch Map & Live Monitoring Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 min-h-[420px]">
          <LiveMapCard
            fleetStatus={overview?.fleetStatus}
            heatmapData={fleetMapData}
            isLoading={mapLoading || overviewLoading}
          />
        </div>
        <div className="lg:col-span-1 min-h-[420px]">
          <LiveMonitoringCard
            data={monitoringData}
            isLoading={monitoringLoading}
          />
        </div>
      </div>

      {/* Section 3: Dispatch Queue & Active Fleet Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="min-h-[260px]">
          <DispatchQueueCard items={queueItems} isLoading={queueLoading} />
        </div>
        <div className="min-h-[260px]">
          <FleetHealthCard
            health={overview?.fleetHealth}
            isLoading={overviewLoading}
          />
        </div>
      </div>

      {/* Section 4: Supply & Demand Zone Balancer */}
      <div>
        <SupplyDemandCard
          data={supplyDemandData}
          isLoading={supplyDemandLoading}
        />
      </div>

      {/* Section 5: Earnings Trend Chart & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="min-h-[300px]">
          <EarningsTrendChart />
        </div>
        <div className="min-h-[300px]">
          <RecentActivityCard
            items={recentActivity}
            isLoading={activityLoading}
          />
        </div>
      </div>
    </div>
  );
}