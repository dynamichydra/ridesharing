export interface DashboardStats {
  drivers: { total: number; pendingApproval: number; online: number };
  riders: { total: number };
  rides: { total: number; today: number; todayCompleted: number };
  subscriptions: { active: number };
}

export interface RideStatRow {
  date: string;
  completed: string | number;
  cancelled: string | number;
  expired: string | number;
  total: string | number;
}