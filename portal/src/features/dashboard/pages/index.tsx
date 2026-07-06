import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  ShieldAlert,
  Compass,
  TrendingUp,
  CreditCard,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Loader from "@/components/fullpage-loader";

interface DashboardStats {
  drivers: { total: number; pendingApproval: number; online: number };
  riders: { total: number };
  rides: { total: number; today: number; todayCompleted: number };
  subscriptions: { active: number };
}

interface RideStatRow {
  date: string;
  completed: string | number;
  cancelled: string | number;
  expired: string | number;
  total: string | number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiClient.get<DashboardStats>("/admin/dashboard").then(res => res.MESSAGE),
  });

  const { data: chartData = [], isLoading: chartLoading } = useQuery<RideStatRow[]>({
    queryKey: ["dashboard-ride-stats"],
    queryFn: () => apiClient.get<any>("/admin/stats/rides?days=7").then(res => {
      const msg = res.MESSAGE;
      if (Array.isArray(msg)) return msg;
      if (msg && Array.isArray(msg.rows)) return msg.rows;
      return [];
    }),
  });

  if (statsLoading || chartLoading) {
    return <Loader />;
  }

  const cards = [
    {
      title: "Active Riders",
      value: stats?.riders?.total || 0,
      description: "Total registered riders",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Online Drivers",
      value: stats?.drivers?.online || 0,
      description: `${stats?.drivers?.total || 0} total drivers registered`,
      icon: Compass,
      color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Pending Approval",
      value: stats?.drivers?.pendingApproval || 0,
      description: "Drivers awaiting documents review",
      icon: ShieldAlert,
      color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    },
    {
      title: "Active Subscriptions",
      value: stats?.subscriptions?.active || 0,
      description: "Drivers with active plans",
      icon: CreditCard,
      color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  const todayRides = stats?.rides?.today || 0;
  const todayCompleted = stats?.rides?.todayCompleted || 0;
  const completionRate = todayRides > 0 ? Math.round((todayCompleted / todayRides) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-1">Real-time status and telemetry of the RideShare Platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => (
          <Card key={idx} className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
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
              <div className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-1">{todayCompleted}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm mb-2">Completion Rate</div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500" 
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="text-right text-xs font-semibold text-muted-foreground mt-1">{completionRate}%</div>
            </div>
          </CardContent>
        </Card>

        {/* Recharts Area Chart */}
        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ride Analytics (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#800080" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#800080" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "oklch(var(--card))", 
                      borderColor: "oklch(var(--border))",
                      color: "oklch(var(--foreground))"
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area name="Total Requests" type="monotone" dataKey="total" stroke="#800080" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area name="Completed Rides" type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
