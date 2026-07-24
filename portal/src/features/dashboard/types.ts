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

// GET /admin/stats/subscriptions — raw SQL row, keys are the query's literal column
// aliases (snake_case), not camelCased by drizzle (this is db.execute(sql\`...\`), not the
// query builder) — same as RideStatRow above.
export interface SubscriptionStatRow {
  plan_name: string;
  plan_type: string;
  price_minor: string | number;
  currency_code: string;
  total_subscriptions: string | number;
  active_count: string | number;
}