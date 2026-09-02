import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, BarChart2 } from "lucide-react";
import { useEarningsTrend, useDashboardOverview } from "./hooks";

interface EarningsTrendChartProps {
  initialTimeframe?: string;
  initialCurrency?: string;
}

function getCurrencySymbol(currencyCode: string): string {
  switch (currencyCode.toUpperCase()) {
    case "INR":
      return "₹";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "CAD":
      return "CA$";
    case "AUD":
      return "A$";
    case "JPY":
      return "¥";
    case "USD":
    default:
      return "$";
  }
}

export default function EarningsTrendChart({
  initialTimeframe = "week",
  initialCurrency = "all",
}: EarningsTrendChartProps) {
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [currency, setCurrency] = useState(initialCurrency);

  const { data: overview } = useDashboardOverview();
  const availableCurrencies = overview?.kpis?.weeklyEarningsByCurrency?.map((c) => c.currencyCode.toUpperCase()) || ["USD", "INR"];

  const { data: trendData = [], isLoading } = useEarningsTrend(
    timeframe,
    currency !== "all" ? currency : undefined
  );

  const activeSymbol = currency !== "all" ? getCurrencySymbol(currency) : "$";

  const formattedChartData = trendData.map((d) => ({
    name: d.dayName || d.date,
    revenue: Math.round(d.revenueMinor / 100),
    currencyCode: d.currencyCode || currency.toUpperCase(),
    rides: d.completedCount,
    total: d.totalRides,
  }));

  return (
    <Card className="border-border bg-card shadow-xs flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">
            Earnings & Revenue Trend
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency Filter */}
          <div className="w-28">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-8 text-xs border-border bg-background">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                {Array.from(new Set(availableCurrencies)).map((code) => (
                  <SelectItem key={code} value={code}>
                    {code} ({getCurrencySymbol(code)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timeframe Filter */}
          <div className="w-28">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-8 text-xs border-border bg-background">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="last_week">Last 14 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-center min-h-[260px]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
            Loading trend telemetry…
          </div>
        ) : formattedChartData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground py-8 gap-1.5">
            <BarChart2 className="h-7 w-7 text-muted-foreground/50" />
            <p>No revenue or ride transactions for this timeframe and currency.</p>
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="name"
                  className="text-[11px] fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-[11px] fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${activeSymbol}${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value;
                      const itemData = payload[0].payload;
                      const itemSymbol = getCurrencySymbol(itemData.currencyCode || currency);
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs">
                          <p className="font-semibold text-popover-foreground">{label}</p>
                          <p className="text-primary font-bold mt-1">
                            Gross: {itemSymbol}{Number(val).toLocaleString()} {itemData.currencyCode}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {itemData.rides} completed trips
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  name="Gross Revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#earningsPrimary)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}