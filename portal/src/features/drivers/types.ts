
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
  approvedBy: string | null;
  approvedAt: string | null;
  isOnline: boolean;
  isBlocked: boolean;
  currentLat: string | null;
  currentLng: string | null;
  lastLocationAt: string | null;
  fcmToken: string | null;
  rating: string;
  totalRatings: number;
  totalRides: number;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  dateOfBirth: string | null;
  gender: string | null;
  referralCode: string | null;
  referredByDriverId: string | null;
  preferredLanguageCode: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  registrationStatus: string;
  registrationStep: number;
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
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
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
