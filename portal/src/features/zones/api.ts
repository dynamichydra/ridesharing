import { apiClient } from "@/lib/api-client";
import type {
  Zone,
  ZoneListParams,
  ZonePayload,
  ZoneDetectPayload,
  GenerateHexCellsPayload,
  Country,
} from "./types";

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

  // GET /zones?countryId= (no `page` param hits the backend's unpaginated listAll branch) —
  // used to draw every other zone as map context while drawing/editing/picking a point, not
  // for the table (which stays server-paginated).
  listAllActive: (countryId?: string) =>
    apiClient.get<Zone[]>(`${BASE_URL}${countryId ? `?countryId=${countryId}` : ""}`),

  // GET /zones/:id
  getById: (id: string) => 
    apiClient.get<Zone>(`${BASE_URL}/${id}`),

  // POST /zones
  create: (payload: ZonePayload) => 
    apiClient.post<Zone>(BASE_URL, payload),

  // PATCH /zones/:id
  update: (id: string, payload: Partial<ZonePayload>) =>
    apiClient.patch<Zone>(`${BASE_URL}/${id}`, payload),

  // PATCH /zones/:id/enable | /disable
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<Zone>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),

  // POST /zones/detect
  detect: (payload: ZoneDetectPayload) =>
    apiClient.post<Zone | null>(`${BASE_URL}/detect`, payload),

  // POST /zones/resolve-hex — all H3 hex-zone matches, priority-ordered (most specific first)
  resolveHex: (payload: ZoneDetectPayload) =>
    apiClient.post<Zone[]>(`${BASE_URL}/resolve-hex`, payload),

  // POST /zones/:id/generate-hex-cells — (re)derive hexCells from the stored polygon
  generateHexCells: ({ id, resolution }: GenerateHexCellsPayload) =>
    apiClient.post<Zone>(`${BASE_URL}/${id}/generate-hex-cells`, { resolution }),
};

export const geoApi = {
  // GET /admin/countries or /geo/countries
  listCountries: () => 
    apiClient.get<Country[]>("/geo/countries"),
};
