import { apiClient } from "@/lib/api-client";
import { buildQueryString } from "@/components/filters/buildQueryString";
import type { PricingVersion, PricingVersionListParams } from "./types";

const BASE_URL = "/pricing-versions";

export const pricingVersionsApi = {
  list: (params: PricingVersionListParams = {}) => {
    const { page, limit, ...rest } = params;
    const query = buildQueryString({
      all: "true",
      page: page ?? 1,
      limit: limit ?? 10,
      ...rest,
    });
    return apiClient.get<PricingVersion[]>(`${BASE_URL}?${query}`);
  },

  getById: (id: string) => apiClient.get<PricingVersion>(`${BASE_URL}/${id}`),

  create: (payload: any) => apiClient.post<PricingVersion>(BASE_URL, payload),

  update: (id: string, payload: any) => apiClient.patch<PricingVersion>(`${BASE_URL}/${id}`, payload),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<PricingVersion>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),
};
