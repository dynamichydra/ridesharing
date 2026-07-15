export type RideStatus =
  | "requested"
  | "searching"
  | "accepted"
  | "arriving"
  | "started"
  | "completed"
  | "cancelled"
  | "expired";

export interface Ride {
  id: string;
  riderId: string;
  driverId: string | null;
  vehicleTypeId: string;
  pickupLat: string;
  pickupLng: string;
  pickupAddress: string | null;
  dropLat: string;
  dropLng: string;
  dropAddress: string | null;
  estimatedFare: string | null;
  finalFare: string | null;
  distanceKm: string | null;
  durationMin: number | null;
  status: RideStatus;
  cancelledBy: string | null;
  cancelReason: string | null;
  requestedAt: string;
}

export interface RideTimelineEvent {
  id: string;
  rideId: string;
  status: string;
  latitude: string | null;
  longitude: string | null;
  note: string | null;
  createdAt: string;
}

export interface RideOffer {
  id: string;
  rideId: string;
  driverId: string;
  driverName?: string;
  driverPhone?: string;
  score: string;
  status: string;
  createdAt: string;
}

export interface RideListParams {
  page?: number;
  limit?: number;
  status?: RideStatus | "";
  driverId?: string;
  riderId?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
