import { apiClient } from "@/lib/api-client";
import type { Zone, ZoneListParams, ZonePayload, ZoneDetectPayload, Country } from "./types";

const BASE_URL = "/zones";

function buildQuery(params: ZoneListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.countryId) {
    query.set("countryId", params.countryId);
  }
  return query.toString();
}

export const zonesApi = {
  // GET /zones?page=&countryId=
  list: (params: ZoneListParams) =>
    apiClient.get<Zone[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /zones/:id
  getById: (id: string) => 
    apiClient.get<Zone>(`${BASE_URL}/${id}`),

  // POST /zones
  create: (payload: ZonePayload) => 
    apiClient.post<Zone>(BASE_URL, payload),

  // PATCH /zones/:id
  update: (id: string, payload: Partial<ZonePayload>) =>
    apiClient.patch<Zone>(`${BASE_URL}/${id}`, payload),

  // DELETE /zones/:id
  remove: (id: string) => 
    apiClient.delete(`${BASE_URL}/${id}`),

  // POST /zones/detect
  detect: (payload: ZoneDetectPayload) =>
    apiClient.post<Zone | null>(`${BASE_URL}/detect`, payload),
};

export const geoApi = {
  // GET /admin/countries or /geo/countries
  listCountries: () => 
    apiClient.get<Country[]>("/geo/countries"),
};
