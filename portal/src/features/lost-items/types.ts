export type LostItemStatus =
  | "open"
  | "driver_contacted"
  | "item_found"
  | "returning"
  | "returned"
  | "closed";

export interface LostItem {
  id: string;
  rideId: string;
  reporterId: string;
  reporterRole: "rider" | "driver";
  driverId: string | null;
  itemCategory: string;
  description: string;
  contactPhone?: string | null;
  photoUrl?: string | null;
  status: LostItemStatus;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LostItemListParams {
  status?: string;
  rideId?: string;
  page?: number;
  limit?: number;
}

export interface UpdateLostItemStatusPayload {
  status: LostItemStatus;
  resolutionNotes?: string;
}
