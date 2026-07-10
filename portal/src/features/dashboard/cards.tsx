import { Users, ShieldAlert, Compass, CreditCard } from "lucide-react";
import type { DashboardStats } from "./types";

export interface DashboardCard {
  key: string;
  title: string;
  value: (stats: DashboardStats | undefined) => number;
  description: (stats: DashboardStats | undefined) => string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// Config-driven stat cards consumed by pages/index.tsx — adding or
// removing a metric never touches the grid rendering logic.
export const dashboardCards: DashboardCard[] = [
  {
    key: "riders",
    title: "Active Riders",
    value: (stats) => stats?.riders?.total || 0,
    description: () => "Total registered riders",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "onlineDrivers",
    title: "Online Drivers",
    value: (stats) => stats?.drivers?.online || 0,
    description: (stats) => `${stats?.drivers?.total || 0} total drivers registered`,
    icon: Compass,
    color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
  },
  {
    key: "pendingApproval",
    title: "Pending Approval",
    value: (stats) => stats?.drivers?.pendingApproval || 0,
    description: () => "Drivers awaiting documents review",
    icon: ShieldAlert,
    color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
  },
  {
    key: "activeSubscriptions",
    title: "Active Subscriptions",
    value: (stats) => stats?.subscriptions?.active || 0,
    description: () => "Drivers with active plans",
    icon: CreditCard,
    color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
  },
];