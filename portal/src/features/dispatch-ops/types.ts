export interface PolicyWeights {
  etaWeight?: number;
  distanceWeight?: number;
  idleWeight?: number;
  ratingWeight?: number;
  acceptanceRateWeight?: number;
  cancellationRateWeight?: number;
  directionWeight?: number;
  zoneDemandWeight?: number;
}

export interface PolicyWaveItem {
  wave: number;
  topCount: number;
  timeoutSec: number;
}

export interface DispatchPolicy {
  id?: string;
  name: string;
  version?: string;
  scope: "global" | "country" | "city" | "zone" | "service_type" | string;
  scopeId?: string | null;
  serviceType?: string | null;
  initialRadiusKm: number | string;
  maxRadiusKm: number | string;
  radiusStepKm: number | string;
  offerTimeoutSeconds: number;
  maxWaves: number;
  maxCandidatesPerWave: number;
  cooldownSeconds: number;
  maxEtaMinutes: number;
  maxLocationAgeSeconds?: number;
  weights?: PolicyWeights;
  waveConfig?: PolicyWaveItem[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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
