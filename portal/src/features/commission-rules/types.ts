export interface CommissionRule {
  id: string;
  name: string;
  countryId?: string | null;
  subscriberRate: number; // percentage (e.g. 5 for 5%)
  nonSubscriberRate: number; // percentage (e.g. 20 for 20%)
  flatCommissionMinor?: number | null;
  currencyCode?: string;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRuleListParams {
  countryId?: string;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}

export interface CreateCommissionRulePayload {
  name: string;
  subscriberRate: number;
  nonSubscriberRate: number;
  flatCommissionMinor?: number;
  countryId?: string;
  description?: string;
}

export interface UpdateCommissionRulePayload extends Partial<CreateCommissionRulePayload> {
  isActive?: boolean;
}
