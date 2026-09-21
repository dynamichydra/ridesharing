export interface DriverGroup {
  id: string;
  countryId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverGroupMember {
  id: string;
  assignedAt: string;
  expiresAt?: string | null;
  driver: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    rating?: number | null;
    isOnline: boolean;
    subscriptionStatus: string;
    approvalStatus: string;
  };
}

export interface DriverGroupListParams {
  page?: number;
  limit?: number;
  countryId?: string;
  isActive?: boolean;
  search?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateDriverGroupPayload {
  countryId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateDriverGroupPayload = Partial<CreateDriverGroupPayload>;

export interface AddGroupMembersPayload {
  driverIds: string[];
  expiresAt?: string | null;
}
