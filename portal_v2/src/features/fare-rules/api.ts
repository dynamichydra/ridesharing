import { apiClient } from "@/lib/api-client";
import type {
  FareRule,
  FareRuleListParams,
  FareRulePayload,
  UpdateFareRulePayload,
  LookupOption,
  TaxRule,
  TaxRuleListParams,
  TaxRulePayload,
  UpdateTaxRulePayload,
  CommissionRule,
  CommissionRuleListParams,
  CommissionRulePayload,
  UpdateCommissionRulePayload,
} from "./types";

// Base path: /fare — rule CRUD lives under /fare/rules (Admin only)
const BASE_URL = "/fare/rules";

function buildQuery(params: FareRuleListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.ruleType) query.set("ruleType", params.ruleType);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.countryId) query.set("countryId", params.countryId);
  return query.toString();
}

export const fareRulesApi = {
  // GET /fare/rules?page=&limit=  (Admin)
  // NOTE: this endpoint wraps each row as { rule: {...fields} } — confirmed via
  // Network tab. Unwrapped right here so column.tsx/list.tsx never see the
  // wrapper key. (GET /fare/rules/:id returns the entity directly, unwrapped —
  // flag if that turns out not to be the case.)
  list: async (params: FareRuleListParams) => {
    const res = await apiClient.get<Array<{ rule: FareRule }>>(`${BASE_URL}?${buildQuery(params)}`);
    return { ...res, MESSAGE: (res.MESSAGE ?? []).map((item) => item.rule) };
  },

  // GET /fare/rules/:id  (Admin) — used for both View Details and Edit prefill
  getById: (id: string) => apiClient.get<FareRule>(`${BASE_URL}/${id}`),

  // POST /fare/rules  (Admin) — only the fields required by the selected ruleType
  create: (payload: FareRulePayload) => apiClient.post<FareRule>(BASE_URL, payload),

  // PATCH /fare/rules/:id  (Admin) partial fields
  update: (id: string, payload: UpdateFareRulePayload) =>
    apiClient.patch<FareRule>(`${BASE_URL}/${id}`, payload),

  // PATCH /fare/rules/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<FareRule>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),
};

// ---------------------------------------------------------------------
// Dropdown lookups — Country / Vehicle Type / Zone. These hit the exact
// Public endpoints already documented elsewhere in the API reference
// (GET /geo/countries, GET /vehicle-types, GET /zones). If this project
// already has shared hooks for these from the Countries/Vehicle
// Types/Zones features, prefer wiring those in instead of this local
// fetcher — this is a minimal stand-in so the dropdowns aren't left empty.
// ---------------------------------------------------------------------

// ── Tax Rules — /fare/tax-rules (Admin) ───────────────────────────────────
// Note: unlike /fare/rules, the backend's listPaginated() ignores all query filters
// besides page/limit — no countryId/appliesTo filter exists server-side yet.
const TAX_RULES_BASE_URL = "/fare/tax-rules";

export const taxRulesApi = {
  list: (params: TaxRuleListParams = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.countryId) q.set("countryId", params.countryId);
    if (params.stateId) q.set("stateId", params.stateId);
    if (params.cityId) q.set("cityId", params.cityId);
    if (params.appliesTo) q.set("appliesTo", params.appliesTo);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<TaxRule[]>(`${TAX_RULES_BASE_URL}?${q.toString()}`);
  },

  create: (payload: TaxRulePayload) => apiClient.post<TaxRule>(TAX_RULES_BASE_URL, payload),

  update: (id: string, payload: UpdateTaxRulePayload) =>
    apiClient.patch<TaxRule>(`${TAX_RULES_BASE_URL}/${id}`, payload),

  // DELETE /fare/tax-rules/:id — a soft delete server-side (sets isActive=false), not a real
  // row deletion, so this is the same enable/disable toggle convention as everything else.
  disable: (id: string) => apiClient.delete<{ deleted: true }>(`${TAX_RULES_BASE_URL}/${id}`),
};

// ── Commission Rules — /commission-rules (Admin) ──────────────────────────
// Same { rule: {...} } row-wrapper convention as /fare/rules — unwrapped here so
// column.tsx/list.tsx never see it.
const COMMISSION_RULES_BASE_URL = "/commission-rules";

export const commissionRulesApi = {
  list: async (params: CommissionRuleListParams) => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 10));
    if (params.countryId) query.set("countryId", params.countryId);
    if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
    const res = await apiClient.get<Array<{ rule: CommissionRule }>>(`${COMMISSION_RULES_BASE_URL}?${query.toString()}`);
    return { ...res, MESSAGE: (res.MESSAGE ?? []).map((item) => item.rule) };
  },

  create: (payload: CommissionRulePayload) => apiClient.post<CommissionRule>(COMMISSION_RULES_BASE_URL, payload),

  update: (id: string, payload: UpdateCommissionRulePayload) =>
    apiClient.patch<CommissionRule>(`${COMMISSION_RULES_BASE_URL}/${id}`, payload),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<CommissionRule>(`${COMMISSION_RULES_BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),
};

export const lookupsApi = {
  // GET /geo/countries  (Public)
  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),

  // GET /vehicle-types  (Public)
  listVehicleTypes: () => apiClient.get<LookupOption[]>("/vehicle-types"),

  // GET /zones  (Public)
  listZones: () => apiClient.get<LookupOption[]>("/zones"),
};

// ── Pricing Plans & Versions (Core Rate Engine) ───────────────────────────

export const pricingPlansApi = {
  list: (params: { page?: number; limit?: number; cityId?: string; zoneId?: string; vehicleTypeId?: string; isActive?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.cityId) q.set("cityId", params.cityId);
    if (params.zoneId) q.set("zoneId", params.zoneId);
    if (params.vehicleTypeId) q.set("vehicleTypeId", params.vehicleTypeId);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<any>(`/fare/plans?${q.toString()}`);
  },

  getById: (id: string) => apiClient.get<any>(`/fare/plans/${id}`),

  create: (payload: any) => apiClient.post<any>("/fare/plans", payload),

  update: (id: string, payload: any) => apiClient.patch<any>(`/fare/plans/${id}`, payload),

  createVersion: (planId: string, payload: any) => apiClient.post<any>(`/fare/plans/${planId}/versions`, payload),

  updateVersion: (planId: string, versionId: string, payload: any) =>
    apiClient.patch<any>(`/fare/plans/${planId}/versions/${versionId}`, payload),
};

// ── Pricing Rules (Night, Peak, Surge, Toll, Airport) ─────────────────────

export const pricingRulesAdminApi = {
  listNightRules: (params: { pricingPlanId?: string; isActive?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.pricingPlanId) q.set("pricingPlanId", params.pricingPlanId);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<any>(`/fare/night-rules?limit=100&${q.toString()}`);
  },
  createNightRule: (payload: any) => apiClient.post<any>("/fare/night-rules", payload),

  listPeakRules: (params: { pricingPlanId?: string; isActive?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.pricingPlanId) q.set("pricingPlanId", params.pricingPlanId);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<any>(`/fare/peak-rules?limit=100&${q.toString()}`);
  },
  createPeakRule: (payload: any) => apiClient.post<any>("/fare/peak-rules", payload),

  listSurgeRules: (params: { cityId?: string; isActive?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.cityId) q.set("cityId", params.cityId);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<any>(`/fare/surge-rules?limit=100&${q.toString()}`);
  },
  createSurgeRule: (payload: any) => apiClient.post<any>("/fare/surge-rules", payload),

  listTollRules: (params: { cityId?: string; isActive?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.cityId) q.set("cityId", params.cityId);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<any>(`/fare/toll-rules?limit=100&${q.toString()}`);
  },
  createTollRule: (payload: any) => apiClient.post<any>("/fare/toll-rules", payload),

  listAirports: (params: { cityId?: string; isActive?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.cityId) q.set("cityId", params.cityId);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<any>(`/fare/airports?limit=100&${q.toString()}`);
  },
  createAirport: (payload: any) => apiClient.post<any>("/fare/airports", payload),
  updateAirport: (id: string, payload: any) => apiClient.patch<any>(`/fare/airports/${id}`, payload),

  listAirportRules: (params: { airportId?: string; isActive?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.airportId) q.set("airportId", params.airportId);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiClient.get<any>(`/fare/airport-rules?limit=100&${q.toString()}`);
  },
  createAirportRule: (payload: any) => apiClient.post<any>("/fare/airport-rules", payload),
};

