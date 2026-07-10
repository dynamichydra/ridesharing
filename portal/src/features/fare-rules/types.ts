export type FareRuleType = "time" | "zone" | "traffic" | "custom";

export interface FareRule {
  id: string;
  name: string;
  ruleType: FareRuleType;
  multiplier: string;
  description: string | null;
  zoneId: string | null;
  startTime: string | null; // e.g. "22:00" for time-based rules
  endTime: string | null; // e.g. "06:00" for time-based rules
  isActive: boolean;
  sortOrder: number | null;
  createdAt?: string;
}

export interface FareRuleListParams {
  page?: number;
  limit?: number;
  ruleType?: string;
  isActive?: boolean;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FareRulePayload {
  name: string;
  ruleType: FareRuleType;
  multiplier: number;
  description?: string;
  zoneId?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateFareRulePayload = Partial<FareRulePayload>;