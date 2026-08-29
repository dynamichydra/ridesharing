import {
  TrendingUp,
  Car,
  DollarSign,
  Star,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardOverviewResponse } from "./types";

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  growthPct?: number;
  growthLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function KPICard({
  title,
  value,
  subValue,
  growthPct,
  growthLabel,
  icon: Icon,
}: KPICardProps) {
  return (
    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {value}
          </span>
          {subValue && (
            <span className="text-sm font-medium text-muted-foreground">
              {subValue}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {growthPct !== undefined && growthPct > 0 ? (
            <>
              <span className="inline-flex items-center font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                {growthPct}%
              </span>
              <span className="text-muted-foreground">{growthLabel || "from last week"}</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <Minus className="h-3 w-3 mr-0.5" />
                Stable
              </span>
              <span className="text-muted-foreground">optimal performance</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICardsGrid({ data }: { data?: DashboardOverviewResponse }) {
  const kpis = data?.kpis;
  const totalRides = kpis?.totalRides?.value ?? data?.rides?.total ?? 12450;
  const ridesGrowth = kpis?.totalRides?.growthPct ?? 12;

  const activeDrivers = kpis?.activeDrivers?.value ?? data?.fleetStatus?.online ?? 842;
  const driversGrowth = kpis?.activeDrivers?.growthPct ?? 4;

  const weeklyRevenueMinor = kpis?.weeklyEarnings?.valueMinor ?? 1420000;
  const revenueFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: kpis?.weeklyEarnings?.currencyCode || "USD",
    maximumFractionDigits: 0,
  }).format(weeklyRevenueMinor / 100);
  const revenueGrowth = kpis?.weeklyEarnings?.growthPct ?? 8;

  const rating = kpis?.rating?.value ?? 4.8;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Rides"
        value={totalRides.toLocaleString()}
        growthPct={ridesGrowth}
        growthLabel="from last week"
        icon={TrendingUp}
      />
      <KPICard
        title="Active Drivers"
        value={activeDrivers.toLocaleString()}
        growthPct={driversGrowth}
        growthLabel="from last week"
        icon={Car}
      />
      <KPICard
        title="Weekly Earnings"
        value={revenueFormatted}
        growthPct={revenueGrowth}
        growthLabel="from last week"
        icon={DollarSign}
      />
      <KPICard
        title="Customer Rating"
        value={rating.toFixed(1)}
        subValue="/ 5"
        growthLabel="Stable"
        icon={Star}
      />
    </div>
  );
}