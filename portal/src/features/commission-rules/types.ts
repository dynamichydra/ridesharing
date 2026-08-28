export interface CommissionRule {
  id: string;
  name: string;
  countryId?: string | null;
  vehicleTypeId?: string | null;
  bookingFeeMinor: number;
  subscriberRate: string | number; // e.g. "0.0500" from backend
  nonSubscriberRate: string | number; // e.g. "0.2000" from backend
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  country?: {
    id: string;
    name: string;
    isoCode?: string;
    currencyCode?: string;
  } | null;
  vehicleType?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
}

export interface LookupOption {
  id: string;
  name: string;
}

export interface CommissionRuleListParams {
  countryId?: string;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}

export interface CreateCommissionRulePayload {
  name: string;
  countryId?: string | null;
  vehicleTypeId?: string | null;
  bookingFeeMinor?: number;
  subscriberRate: number; // decimal e.g. 0.05
  nonSubscriberRate: number; // decimal e.g. 0.20
  priority?: number;
}

export interface UpdateCommissionRulePayload extends Partial<CreateCommissionRulePayload> {
  isActive?: boolean;
}
