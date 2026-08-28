export interface DispatchPolicy {
  id?: string;
  name: string;
  searchRadiusKm: number;
  maxDispatchAttempts: number;
  offerTimeoutSeconds: number;
  batchSize: number;
  surgeMultiplierCap: number;
  airportQueueEnabled: boolean;
  isActive: boolean;
}

export interface ActiveDispatchJob {
  rideId: string;
  attempt: number;
  candidateDriverIds: string[];
  status: string;
  createdAt: string;
  elapsedSeconds: number;
}

export interface SupplyDemandMetric {
  zoneId: string;
  zoneName: string;
  availableDrivers: number;
  pendingRides: number;
  surgeMultiplier: number;
  updatedAt: string;
}

export interface AirportQueueStatus {
  totalDriversInQueue: number;
  estimatedWaitMinutes: number;
  activeFlightArrivals: number;
}
