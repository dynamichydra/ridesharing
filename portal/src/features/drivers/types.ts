export interface Driver {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  profilePhoto: string | null;
  licenseNumber: string | null;
  licenseDoc: string | null;
  aadharNumber: string | null;
  aadharDoc: string | null;
  vehicleTypeId: string | null;
  vehicleNumber: string | null;
  vehicleModel: string | null;
  vehiclePhoto: string | null;
  vehicleYear: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  approvalNote: string | null;
  isOnline: boolean;
  isBlocked: boolean;
  rating: string;
  totalRides: number;
  subscriptionStatus: string;
}

export interface DriverListParams {
  page?: number;
  limit?: number;
  approvalStatus?: string;
  subscriptionStatus?: string;
  registrationStatus?: string;
  countryId?: string;
  cityId?: string;
  isBlocked?: boolean;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApproveDriverPayload {
  note?: string;
}

export interface RejectDriverPayload {
  note: string;
}

export interface RequestDocumentsPayload {
  documentTypeCodes: string[];
  note?: string;
}