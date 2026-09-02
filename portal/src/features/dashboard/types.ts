export interface CurrencyEarningsItem {
  currencyCode: string;
  valueMinor: number;
  totalMinor?: number;
  growthPct: number;
  growthLabel?: string;
}

export interface DashboardKPIs {
  totalRides: {
    value: number;
    growthPct: number;
    growthLabel: string;
  };
  activeDrivers: {
    value: number;
    growthPct: number;
    growthLabel: string;
  };
  weeklyEarnings: CurrencyEarningsItem;
  weeklyEarningsByCurrency?: CurrencyEarningsItem[];
  rating: {
    value: number;
    scale: number;
    trendLabel: string;
  };
}

export interface FleetStatus {
  online: number;
  onTrip: number;
  idle: number;
  offline: number;
  total: number;
  pendingApproval: number;
}

export interface FleetHealth {
  batteryOptimalPct: number;
  tireNormalPct: number;
  inspectionOptimalPct: number;
  activeAlerts: number;
}

export interface TodayStats {
  requested: number;
  completed: number;
  cancelled: number;
  completionRate: number;
}

export interface DashboardOverviewResponse {
  kpis: DashboardKPIs;
  fleetStatus: FleetStatus;
  today: TodayStats;
  fleetHealth: FleetHealth;
  drivers: { total: number; pendingApproval: number; online: number };
  riders: { total: number };
  rides: { total: number; today: number; todayCompleted: number };
  subscriptions: { active: number };
}

export interface DispatchQueueItem {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  vehicleTypeName: string;
  vehicleCategory: string;
  passengerCount: number;
  estimatedFareMinor: number;
  currencyCode: string;
  status: string;
  waitingMinutes: number;
  etaMinutes: number;
  riderName: string;
}

export interface LiveAlertItem {
  id: string;
  type: 'emergency' | 'deviation' | 'surge' | 'warning' | string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | string;
  createdAt: string | Date;
}

export interface TelemetryEventLog {
  id: string;
  time: string;
  text: string;
  level: 'primary' | 'success' | 'error' | 'info' | 'neutral' | string;
  timestamp: string | Date;
}

export interface LiveMonitoringResponse {
  alerts: LiveAlertItem[];
  eventLogs: TelemetryEventLog[];
}

export interface ZoneAnalyticsItem {
  zoneId: string;
  zoneName: string;
  supplyPct: number;
  demandPct: number;
  gapLabel: string;
  isSurplus: boolean;
  multiplier: number;
}

export interface SupplyDemandResponse {
  marketEquilibriumScore: number;
  statusLabel: string;
  summaryMessage: string;
  onlineDriversCount: number;
  activeRidesCount: number;
  zones: ZoneAnalyticsItem[];
}

export interface EarningsTrendItem {
  date: string;
  dayName: string;
  completedCount: number;
  cancelledCount: number;
  totalRides: number;
  revenueMinor: number;
  revenueFormatted: string;
  currencyCode: string;
}

export interface RecentActivityItem {
  id: string;
  riderName: string;
  driverName?: string | null;
  vehicleTypeName: string;
  pickupAddress: string;
  dropAddress: string;
  fareMinor: number;
  currencyCode: string;
  status: string;
  timeAgo: string;
  requestedAt: string | Date;
}

export interface LiveHeatmapDriver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isOnTrip: boolean;
  rating?: string | number;
  vehicleModel?: string;
}

export interface LiveHeatmapRide {
  id: string;
  status: string;
  pickupLat: number;
  pickupLng: number;
  dropLat?: number;
  dropLng?: number;
  pickupAddress?: string;
  dropAddress?: string;
}

export interface LiveMapHeatmapResponse {
  supply: {
    onlineDriversCount: number;
    drivers: LiveHeatmapDriver[];
  };
  demand: {
    activeRidesCount: number;
    rides: LiveHeatmapRide[];
  };
}

export interface RideStatRow {
  date: string;
  completed: string | number;
  cancelled: string | number;
  expired: string | number;
  total: string | number;
}

export interface SubscriptionStatRow {
  plan_name: string;
  plan_type: string;
  price_minor: string | number;
  currency_code: string;
  total_subscriptions: string | number;
  active_count: string | number;
}