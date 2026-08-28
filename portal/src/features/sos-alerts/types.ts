export type SosAlertStatus = "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_ALARM";
export type SosUserType = "RIDER" | "DRIVER";

export interface SosAlert {
  id: string;
  rideId: string;
  userId: string;
  userType: SosUserType;
  latitude: number | null;
  longitude: number | null;
  status: SosAlertStatus;
  triggeredAt: string;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SosAlertListParams {
  status?: SosAlertStatus | "";
  userType?: SosUserType | "";
  page?: number;
  limit?: number;
}

export interface ResolveSosAlertPayload {
  resolutionNotes: string;
}
