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
