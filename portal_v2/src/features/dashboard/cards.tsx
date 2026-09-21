import { useState } from "react";
import {
  TrendingUp,
  Car,
  DollarSign,
  Star,
  ArrowUpRight,
  Minus,
  Coins,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardOverviewResponse, CurrencyEarningsItem } from "./types";

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  growthPct?: number;
  growthLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  headerAction?: React.ReactNode;
  footerContent?: React.ReactNode;
}

export function KPICard({
  title,
  value,
  subValue,
  growthPct,
  growthLabel,
  icon: Icon,
  headerAction,
  footerContent,
}: KPICardProps) {
  return (
    <Card className="border-border bg-card shadow-xs hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {headerAction}
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
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

        <div className="space-y-1.5">
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
                  {growthPct !== undefined && growthPct < 0 ? `${growthPct}%` : "0%"}
                </span>
                <span className="text-muted-foreground">{growthLabel || "from last week"}</span>
              </>
            )}
          </div>
          {footerContent}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrencyAmount(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${currency.toUpperCase()} ${(minor / 100).toFixed(0)}`;
  }
}

export function MultiCurrencyRevenueCard({
  currencyEarnings = [],
  fallbackEarnings,
}: {
  currencyEarnings?: CurrencyEarningsItem[];
  fallbackEarnings?: CurrencyEarningsItem;
}) {
  const list = currencyEarnings.length > 0
    ? currencyEarnings
    : fallbackEarnings
    ? [fallbackEarnings]
    : [{ currencyCode: "USD", valueMinor: 0, growthPct: 0, growthLabel: "from last week" }];

  const [selectedCurrency, setSelectedCurrency] = useState(list[0]?.currencyCode || "USD");

  const currentItem = list.find((item) => item.currencyCode.toUpperCase() === selectedCurrency.toUpperCase()) || list[0];
  const formattedRevenue = formatCurrencyAmount(currentItem?.valueMinor || 0, currentItem?.currencyCode || "USD");

  const otherCurrencies = list.filter((item) => item.currencyCode.toUpperCase() !== currentItem?.currencyCode.toUpperCase());

  return (
    <KPICard
      title="Weekly Revenue"
      value={formattedRevenue}
      subValue={currentItem?.currencyCode}
      growthPct={currentItem?.growthPct ?? 0}
      growthLabel="from last week"
      icon={DollarSign}
      headerAction={
        list.length > 1 ? (
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md">
            {list.map((c) => {
              const code = c.currencyCode.toUpperCase();
              const isSelected = code === currentItem.currencyCode.toUpperCase();
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCurrency(code)}
                  className={`px-1.5 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        ) : undefined
      }
      footerContent={
        otherCurrencies.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
            <Coins className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <span>Also:</span>
            {otherCurrencies.map((c) => (
              <Badge
                key={c.currencyCode}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 font-normal cursor-pointer hover:bg-muted"
                onClick={() => setSelectedCurrency(c.currencyCode.toUpperCase())}
              >
                {formatCurrencyAmount(c.valueMinor, c.currencyCode)}
              </Badge>
            ))}
          </div>
        ) : undefined
      }
    />
  );
}

export function KPICardsGrid({ data }: { data?: DashboardOverviewResponse }) {
  const kpis = data?.kpis;
  const totalRides = kpis?.totalRides?.value ?? data?.rides?.total ?? 0;
  const ridesGrowth = kpis?.totalRides?.growthPct ?? 0;

  const activeDrivers = kpis?.activeDrivers?.value ?? data?.fleetStatus?.online ?? 0;
  const driversGrowth = kpis?.activeDrivers?.growthPct ?? 0;

  const rating = kpis?.rating?.value ?? 0;

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
      <MultiCurrencyRevenueCard
        currencyEarnings={kpis?.weeklyEarningsByCurrency}
        fallbackEarnings={kpis?.weeklyEarnings}
      />
      <KPICard
        title="Fleet Rating"
        value={rating > 0 ? rating.toFixed(1) : "N/A"}
        subValue={rating > 0 ? "/ 5.0" : ""}
        growthPct={0}
        growthLabel={rating > 0 ? "verified" : "no ratings yet"}
        icon={Star}
      />
    </div>
  );
}