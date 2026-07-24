export type FareRuleType = "time" | "traffic" | "zone";

// Matches the detailed Fare Rules frontend spec's field breakdown exactly.
// NOTE: this drops `description` and `sortOrder` from the previous version of
// this feature — the new spec's Common/Time/Traffic/Zone field lists don't
// mention either, so they're treated as no longer backend-supported. Flag if
// that's wrong and the backend still accepts them.
export interface FareRule {
  id: string;
  name: string;
  countryId: string;
  ruleType: FareRuleType;
  multiplier: string;
  priority: number;
  vehicleTypeId: string;
  // Zone-rule field (also present in the "Common Fields" list, but only ever
  // populated when ruleType === "zone" per the per-type field breakdown)
  zoneId: string | null;
  // Time-rule fields
  startTime: string | null; // e.g. "22:00"
  endTime: string | null; // e.g. "06:00"
  daysOfWeek: number[] | null; // 0 (Sun) – 6 (Sat)
  // Traffic-rule field
  trafficDelayS: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface FareRuleListParams {
  page?: number;
  limit?: number;
  ruleType?: FareRuleType | "";
  isActive?: boolean;
  countryId?: string;
}

// Real runtime shape (confirmed via Network tab) — currentPage/itemsPerPage/
// totalItems/totalPages — matches the API doc. Consumed directly from
// data?.PAGINATION in list.tsx, no remapping in api.ts.
export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

interface FareRuleBasePayload {
  name: string;
  countryId: string;
  ruleType: FareRuleType;
  multiplier: number;
  priority: number;
  vehicleTypeId: string;
}

export interface TimeFareRulePayload extends FareRuleBasePayload {
  ruleType: "time";
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}

export interface TrafficFareRulePayload extends FareRuleBasePayload {
  ruleType: "traffic";
  trafficDelayS: number;
}

export interface ZoneFareRulePayload extends FareRuleBasePayload {
  ruleType: "zone";
  zoneId: string;
}

// The frontend only ever submits the fields required by the selected rule
// type — never all of them at once.
export type FareRulePayload = TimeFareRulePayload | TrafficFareRulePayload | ZoneFareRulePayload;

export type UpdateFareRulePayload = Partial<FareRuleBasePayload> &
  Partial<{
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    trafficDelayS: number;
    zoneId: string;
    isActive: boolean;
  }>;

// Minimal option shape for the Country / Vehicle Type / Zone dropdowns.
export interface LookupOption {
  id: string;
  name: string;
}

// ── Tax Rules (same backend module, /fare/tax-rules) ─────────────────────

export type TaxAppliesTo = "fare" | "subscription" | "both";

export interface TaxRule {
  id: string;
  countryId: string;
  stateId: string | null; // null = applies to the whole country — state-level rules aren't resolved yet
  name: string; // e.g. "GST", "HST", "PST"
  appliesTo: TaxAppliesTo;
  rate: string; // decimal string, e.g. "0.1300" = 13%
  isInclusive: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxRuleListParams {
  page?: number;
  limit?: number;
}

export interface TaxRulePayload {
  countryId: string;
  stateId?: string;
  name: string;
  appliesTo: TaxAppliesTo;
  rate: number;
  isInclusive?: boolean;
}

export type UpdateTaxRulePayload = Partial<TaxRulePayload> & { isActive?: boolean };

// ── Commission Rules (same backend module family, /commission-rules) ─────
// Per-ride platform cut — a booking fee off the top plus a %, with a separate rate for
// drivers with an active subscription vs without one (subscription is a discount on the
// commission, not a full waiver — see backend commission.service.js).

export interface CommissionRule {
  id: string;
  name: string;
  countryId: string | null; // null = global default
  vehicleTypeId: string | null; // null = all vehicle types
  bookingFeeMinor: number;
  subscriberRate: string; // decimal string, e.g. "0.1500" = 15%
  nonSubscriberRate: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRuleListParams {
  page?: number;
  limit?: number;
  countryId?: string;
  isActive?: boolean;
}

export interface CommissionRulePayload {
  name: string;
  countryId?: string;
  vehicleTypeId?: string;
  bookingFeeMinor: number;
  subscriberRate: number;
  nonSubscriberRate: number;
  priority?: number;
}

export type UpdateCommissionRulePayload = Partial<CommissionRulePayload> & { isActive?: boolean };
