import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { countriesApi, statesApi, citiesApi, cityTypesApi, serviceAreasApi, currenciesApi, geoLookupApi } from "./api";
import type {
  CountryListParams,
  CreateCountryPayload,
  UpdateCountryPayload,
  StateListParams,
  CreateStatePayload,
  UpdateStatePayload,
  CityListParams,
  CreateCityPayload,
  UpdateCityPayload,
  CityTypeListParams,
  CreateCityTypePayload,
  UpdateCityTypePayload,
  CityServiceAreaListParams,
  CityServiceAreaPayload,
  UpdateCityServiceAreaPayload,
  CurrencyListParams,
  CreateCurrencyPayload,
  UpdateCurrencyPayload,
} from "./types";
import type { FilterSchema } from "@/components/filters/AutoFilters";

const COUNTRIES_KEY = "geo-countries";
const STATES_KEY = "geo-states";
const CITIES_KEY = "geo-cities";

// "none" is AutoFilters' literal value for "nothing selected" (see AutoFilters.tsx) — treat
// it the same as unset everywhere a draft geo value is read.
function selected(value: unknown): string | undefined {
  return value && value !== "none" ? String(value) : undefined;
}

// ── Countries ────────────────────────────────────────────────────────────────

export function useCountries(params: CountryListParams) {
  return useQuery({
    queryKey: [COUNTRIES_KEY, params],
    queryFn: () => countriesApi.list(params),
  });
}

export function useCreateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCountryPayload) => countriesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COUNTRIES_KEY], refetchType: "active" });
      toast.success("Country created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create country");
    },
  });
}

export function useUpdateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCountryPayload }) =>
      countriesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COUNTRIES_KEY], refetchType: "active" });
      toast.success("Country updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update country");
    },
  });
}

export function useSetCountryActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      countriesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [COUNTRIES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Country enabled" : "Country disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update country status");
    },
  });
}

// ── States ───────────────────────────────────────────────────────────────────

export function useStates(params: StateListParams) {
  return useQuery({
    queryKey: [STATES_KEY, params],
    queryFn: () => statesApi.list(params),
  });
}

export function useCreateState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStatePayload) => statesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATES_KEY], refetchType: "active" });
      toast.success("State created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create state");
    },
  });
}

export function useUpdateState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStatePayload }) =>
      statesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STATES_KEY], refetchType: "active" });
      toast.success("State updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update state");
    },
  });
}

export function useSetStateActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      statesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [STATES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "State enabled" : "State disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update state status");
    },
  });
}

// ── Cities ───────────────────────────────────────────────────────────────────

export function useCities(params: CityListParams) {
  return useQuery({
    queryKey: [CITIES_KEY, params],
    queryFn: () => citiesApi.list(params),
  });
}

export function useCreateCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCityPayload) => citiesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CITIES_KEY], refetchType: "active" });
      toast.success("City created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create city");
    },
  });
}

export function useUpdateCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCityPayload }) =>
      citiesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CITIES_KEY], refetchType: "active" });
      toast.success("City updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update city");
    },
  });
}

export function useSetCityActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      citiesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [CITIES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "City enabled" : "City disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update city status");
    },
  });
}

// ── Public lookups (cascading picker, used by forms + filters) ─────────────────

export function useCountryOptions() {
  return useQuery({
    queryKey: [COUNTRIES_KEY, "lookup"],
    queryFn: () => geoLookupApi.listCountries(),
  });
}

export function useStateOptions(countryId?: string) {
  return useQuery({
    queryKey: [STATES_KEY, "lookup", countryId],
    queryFn: () => geoLookupApi.listStates(countryId as string),
    enabled: !!countryId,
  });
}

export function useCityOptions(stateId?: string) {
  return useQuery({
    queryKey: [CITIES_KEY, "lookup", stateId],
    queryFn: () => geoLookupApi.listCities(stateId as string),
    enabled: !!stateId,
  });
}

export function useCityTypeOptions() {
  return useQuery({
    queryKey: [CITY_TYPES_KEY, "lookup"],
    queryFn: () => geoLookupApi.listCityTypes(),
  });
}

// ── City Types / Tiers ───────────────────────────────────────────────────────

const CITY_TYPES_KEY = "geo-city-types";

export function useCityTypes(params: CityTypeListParams = {}) {
  return useQuery({
    queryKey: [CITY_TYPES_KEY, params],
    queryFn: () => cityTypesApi.list(params),
  });
}

export function useCreateCityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCityTypePayload) => cityTypesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CITY_TYPES_KEY], refetchType: "active" });
      toast.success("City type created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create city type");
    },
  });
}

export function useUpdateCityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCityTypePayload }) =>
      cityTypesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CITY_TYPES_KEY], refetchType: "active" });
      toast.success("City type updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update city type");
    },
  });
}

export function useSetCityTypeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      cityTypesApi.setActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: [CITY_TYPES_KEY], refetchType: "active" });
      toast.success(`City type ${isActive ? "enabled" : "disabled"} successfully!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update city type status");
    },
  });
}

export function useSeedCityTypeDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cityTypesApi.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CITY_TYPES_KEY], refetchType: "active" });
      toast.success("Default city tiers seeded successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to seed default city tiers");
    },
  });
}

// ── Service Areas ────────────────────────────────────────────────────────────

const SERVICE_AREAS_KEY = "geo-service-areas";

export function useServiceAreas(params: CityServiceAreaListParams = {}) {
  return useQuery({
    queryKey: [SERVICE_AREAS_KEY, params],
    queryFn: () => serviceAreasApi.list(params),
  });
}

export function useCreateServiceArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CityServiceAreaPayload) => serviceAreasApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_AREAS_KEY], refetchType: "active" });
      toast.success("Service area created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create service area");
    },
  });
}

export function useUpdateServiceArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCityServiceAreaPayload }) =>
      serviceAreasApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_AREAS_KEY], refetchType: "active" });
      toast.success("Service area updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update service area");
    },
  });
}

export function useSetServiceAreaActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      serviceAreasApi.setActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_AREAS_KEY], refetchType: "active" });
      toast.success(`Service area ${isActive ? "enabled" : "disabled"} successfully!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update service area status");
    },
  });
}

export function useDeleteServiceArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serviceAreasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_AREAS_KEY], refetchType: "active" });
      toast.success("Service area deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete service area");
    },
  });
}

// ── Currencies ───────────────────────────────────────────────────────────────

const CURRENCIES_KEY = "geo-currencies";

export function useCurrencies(params: CurrencyListParams = {}) {
  return useQuery({
    queryKey: [CURRENCIES_KEY, params],
    queryFn: () => currenciesApi.list(params),
  });
}

export function useCurrencyOptions() {
  return useQuery({
    queryKey: [CURRENCIES_KEY, "lookup"],
    queryFn: () => geoLookupApi.listCurrencies(),
  });
}

export function useCreateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCurrencyPayload) => currenciesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY], refetchType: "active" });
      toast.success("Currency created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create currency");
    },
  });
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCurrencyPayload }) =>
      currenciesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY], refetchType: "active" });
      toast.success("Currency updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update currency");
    },
  });
}

export function useSetCurrencyActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      currenciesApi.setActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY], refetchType: "active" });
      toast.success(`Currency ${isActive ? "enabled" : "disabled"} successfully!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update currency status");
    },
  });
}

export function useSeedCurrencies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => currenciesApi.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY], refetchType: "active" });
      toast.success("Default currencies seeded successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to seed default currencies");
    },
  });
}

/**
 * Shared country/state/city FilterSchema fragment
 */
export function useGeoFilterSchema(controller: { draft: Record<string, any> }): FilterSchema {
  const countryId = selected(controller.draft.countryId);
  const stateId = selected(controller.draft.stateId);

  const { data: countriesData } = useCountryOptions();
  const { data: statesData } = useStateOptions(countryId);
  const { data: citiesData } = useCityOptions(stateId);

  return {
    countryId: {
      label: "Country",
      operator: "equals",
      type: "select",
      field: "countryId",
      placeholder: "All Countries",
      options: (countriesData?.MESSAGE ?? []).map((c) => ({ label: c.name, value: c.id })),
    },
    stateId: {
      label: "State",
      operator: "equals",
      type: "select",
      field: "stateId",
      placeholder: countryId ? "All States" : "Select a country first",
      options: (statesData?.MESSAGE ?? []).map((s) => ({ label: s.name, value: s.id })),
    },
    cityId: {
      label: "City",
      operator: "equals",
      type: "select",
      field: "cityId",
      placeholder: stateId ? "All Cities" : "Select a state first",
      options: (citiesData?.MESSAGE ?? []).map((c) => ({ label: c.name, value: c.id })),
    },
  };
}
