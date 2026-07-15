import { apiClient } from "@/lib/api-client";
import type {
  FareRule,
  FareRuleListParams,
  FareRulePayload,
  UpdateFareRulePayload,
  LookupOption,
} from "./types";

// Base path: /fare — rule CRUD lives under /fare/rules (Admin only)
const BASE_URL = "/fare/rules";

function buildQuery(params: FareRuleListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
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

  // DELETE /fare/rules/:id  (Admin) — soft delete
  remove: (id: string) => apiClient.delete(`${BASE_URL}/${id}`),
};

// ---------------------------------------------------------------------
// Dropdown lookups — Country / Vehicle Type / Zone. These hit the exact
// Public endpoints already documented elsewhere in the API reference
// (GET /geo/countries, GET /vehicle-types, GET /zones). If this project
// already has shared hooks for these from the Countries/Vehicle
// Types/Zones features, prefer wiring those in instead of this local
// fetcher — this is a minimal stand-in so the dropdowns aren't left empty.
// ---------------------------------------------------------------------

export const lookupsApi = {
  // GET /geo/countries  (Public)
  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),

  // GET /vehicle-types  (Public)
  listVehicleTypes: () => apiClient.get<LookupOption[]>("/vehicle-types"),

  // GET /zones  (Public)
  listZones: () => apiClient.get<LookupOption[]>("/zones"),
};
