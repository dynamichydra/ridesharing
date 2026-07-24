import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, CreditCard } from "lucide-react";
import { useDashboardStats, useRideStats, useSubscriptionStats } from "../hooks";
import { dashboardCards } from "../cards";
import RideAnalyticsChart from "../chart";

function formatMinor(priceMinor: string | number, currencyCode: string): string {
  const amount = Number(priceMinor) / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: chartData = [], isLoading: chartLoading } = useRideStats(7);
  const { data: planStats = [], isLoading: planStatsLoading } = useSubscriptionStats();

  if (statsLoading || chartLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading dashboard…</div>;
  }

  const todayRides = stats?.rides?.today || 0;
  const todayCompleted = stats?.rides?.todayCompleted || 0;
  const completionRate = todayRides > 0 ? Math.round((todayCompleted / todayRides) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-1">
          Real-time status and telemetry of the RideShare Platform.
        </p>
      </div>

      {/* Stat cards — driven by cards.tsx definitions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((card) => (
          <Card key={card.key} className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value(stats)}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description(stats)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Today's Stats Card */}
        <Card className="border-border bg-card shadow-sm md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Rides Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-muted-foreground text-sm">Requested Rides</div>
              <div className="text-3xl font-extrabold text-foreground mt-1">{todayRides}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Completed Rides</div>
              <div className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-1">
                {todayCompleted}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm mb-2">Completion Rate</div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="text-right text-xs font-semibold text-muted-foreground mt-1">
                {completionRate}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ride Analytics Chart */}
        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ride Analytics (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <RideAnalyticsChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Subscription Plans Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {planStatsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : planStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscription plans yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                    <th className="pb-2 pr-4 font-semibold">Plan</th>
                    <th className="pb-2 pr-4 font-semibold">Type</th>
                    <th className="pb-2 pr-4 font-semibold">Price</th>
                    <th className="pb-2 pr-4 font-semibold">Total Subs</th>
                    <th className="pb-2 font-semibold">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {planStats.map((row) => (
                    <tr key={`${row.plan_name}-${row.plan_type}`} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-foreground">{row.plan_name}</td>
                      <td className="py-2 pr-4 text-muted-foreground capitalize">{row.plan_type}</td>
                      <td className="py-2 pr-4 text-foreground">{formatMinor(row.price_minor, row.currency_code)}</td>
                      <td className="py-2 pr-4 text-foreground">{row.total_subscriptions}</td>
                      <td className="py-2 text-green-600 dark:text-green-400 font-semibold">{row.active_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}