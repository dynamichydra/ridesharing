import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { countriesApi, statesApi, citiesApi, cityTypesApi, currenciesApi, geoLookupApi } from "./api";
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
  UpsertCityTypeFarePayload,
  CurrencyListParams,
  CreateCurrencyPayload,
  UpdateCurrencyPayload,
} from "./types";
import type { FilterSchema } from "@/components/filters/AutoFilters";

const COUNTRIES_KEY = "geo-countries";
const STATES_KEY = "geo-states";
const CITIES_KEY = "geo-cities";
const CITY_TYPES_KEY = "geo-city-types";
const CITY_TYPE_FARES_KEY = "geo-city-type-fares";
const CURRENCIES_KEY = "geo-currencies";

// "none" is AutoFilters' literal value for "nothing selected" (see AutoFilters.tsx) — treat
// it the same as unset everywhere a draft geo value is read.
function selected(value: unknown): string | undefined {
  return value && value !== "none" ? String(value) : undefined;
}

// ── Option / Lookup Hooks ───────────────────────────────────────────────────

export function useCountryOptions() {
  return useQuery({
    queryKey: [COUNTRIES_KEY, "lookup"],
    queryFn: () => geoLookupApi.listCountries(),
  });
}

export function useStateOptions(countryId: string | undefined) {
  return useQuery({
    queryKey: [STATES_KEY, "lookup", countryId],
    queryFn: () => geoLookupApi.listStates(countryId!),
    enabled: !!countryId,
  });
}

export function useCityOptions(stateId: string | undefined) {
  return useQuery({
    queryKey: [CITIES_KEY, "lookup", stateId],
    queryFn: () => geoLookupApi.listCities(stateId!),
    enabled: !!stateId,
  });
}

export function useCityTypeOptions() {
  return useQuery({
    queryKey: [CITY_TYPES_KEY, "lookup"],
    queryFn: () => geoLookupApi.listCityTypes(),
  });
}

export function useCurrencyOptions() {
  return useQuery({
    queryKey: [CURRENCIES_KEY, "lookup"],
    queryFn: () => geoLookupApi.listCurrencies(),
  });
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

export function useCity(id: string | null) {
  return useQuery({
    queryKey: [CITIES_KEY, id],
    queryFn: () => (id ? citiesApi.getById(id) : null),
    enabled: !!id,
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

export function useDeleteCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => citiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CITIES_KEY], refetchType: "active" });
      toast.success("City deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete city");
    },
  });
}

// ── City Types ───────────────────────────────────────────────────────────────

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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [CITY_TYPES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "City type enabled" : "City type disabled");
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
      toast.success("Default city tiers created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to seed default city types");
    },
  });
}

// ── City Type Fares ─────────────────────────────────────────────────────────

export function useCityTypeFares(cityTypeId: string | null) {
  return useQuery({
    queryKey: [CITY_TYPE_FARES_KEY, cityTypeId],
    queryFn: () => (cityTypeId ? cityTypesApi.listFares(cityTypeId) : null),
    enabled: !!cityTypeId,
  });
}

export function useUpsertCityTypeFare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cityTypeId,
      vehicleTypeId,
      payload,
    }: {
      cityTypeId: string;
      vehicleTypeId: string;
      payload: UpsertCityTypeFarePayload;
    }) => cityTypesApi.upsertFare(cityTypeId, vehicleTypeId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CITY_TYPE_FARES_KEY, variables.cityTypeId],
        refetchType: "active",
      });
      toast.success("Fare rate card updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update fare rate");
    },
  });
}

export function useCreateCityTypeFareVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cityTypeId,
      payload,
    }: {
      cityTypeId: string;
      payload: UpsertCityTypeFarePayload;
    }) => cityTypesApi.createFare(cityTypeId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CITY_TYPE_FARES_KEY, variables.cityTypeId],
        refetchType: "active",
      });
      toast.success("New fare rate version created and activated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create fare rate version");
    },
  });
}

export function useActivateCityTypeFare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { fareId: string; cityTypeId: string }) =>
      cityTypesApi.activateFare(vars.fareId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CITY_TYPE_FARES_KEY, variables.cityTypeId],
        refetchType: "active",
      });
      toast.success("Fare rate version activated! Other versions disabled.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to activate fare rate version");
    },
  });
}

export function useDeleteCityTypeFare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { fareId: string; cityTypeId?: string }) =>
      cityTypesApi.deleteFare(vars.fareId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CITY_TYPE_FARES_KEY, variables.cityTypeId],
        refetchType: "active",
      });
      toast.success("Fare rate removed!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete fare rate");
    },
  });
}

// ── Service Areas (Mapped to Cities for backwards compatibility) ─────────────

export function useServiceAreas(params: any = {}) {
  return useQuery({
    queryKey: [CITIES_KEY, "service-areas", params],
    queryFn: () => citiesApi.list(params),
  });
}

// ── Currencies ───────────────────────────────────────────────────────────────

export function useCurrencies(params: CurrencyListParams = {}) {
  return useQuery({
    queryKey: [CURRENCIES_KEY, params],
    queryFn: () => currenciesApi.list(params),
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Currency enabled" : "Currency disabled");
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

export function useSeedCurrencyDefaults() {
  return useSeedCurrencies();
}

// ── Shared country/state/city FilterSchema fragment ─────────────────────────

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
      options: (countriesData?.MESSAGE ?? []).map((c: any) => ({ label: c.name, value: c.id })),
    },
    stateId: {
      label: "State",
      operator: "equals",
      type: "select",
      field: "stateId",
      placeholder: countryId ? "All States" : "Select a country first",
      options: (statesData?.MESSAGE ?? []).map((s: any) => ({ label: s.name, value: s.id })),
    },
    cityId: {
      label: "City",
      operator: "equals",
      type: "select",
      field: "cityId",
      placeholder: stateId ? "All Cities" : "Select a state first",
      options: (citiesData?.MESSAGE ?? []).map((c: any) => ({ label: c.name, value: c.id })),
    },
  };
}

// ── Cascading Geo Filters Hook ───────────────────────────────────────────────

export function useGeoFilters({
  controller,
  showCountry = true,
  showState = true,
  showCity = true,
  showCityType = true,
}: {
  controller: {
    draft: Record<string, unknown>;
    apply: (filters: Record<string, unknown>) => void;
  };
  showCountry?: boolean;
  showState?: boolean;
  showCity?: boolean;
  showCityType?: boolean;
}) {
  const draftCountryId = selected(controller.draft.countryId);
  const draftStateId = selected(controller.draft.stateId);

  const { data: countriesData } = useQuery({
    queryKey: ["geo-lookup-countries"],
    queryFn: () => geoLookupApi.listCountries(),
    enabled: showCountry,
    staleTime: 5 * 60 * 1000,
  });

  const { data: statesData, isFetching: isStatesLoading } = useQuery({
    queryKey: ["geo-lookup-states", draftCountryId],
    queryFn: () => geoLookupApi.listStates(draftCountryId!),
    enabled: showState && !!draftCountryId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: citiesData, isFetching: isCitiesLoading } = useQuery({
    queryKey: ["geo-lookup-cities", draftStateId],
    queryFn: () => geoLookupApi.listCities(draftStateId!),
    enabled: showCity && !!draftStateId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: cityTypesData } = useQuery({
    queryKey: ["geo-lookup-city-types"],
    queryFn: () => geoLookupApi.listCityTypes(),
    enabled: showCityType,
    staleTime: 5 * 60 * 1000,
  });

  const countries = countriesData?.MESSAGE ?? [];
  const states = statesData?.MESSAGE ?? [];
  const cities = citiesData?.MESSAGE ?? [];
  const cityTypes = cityTypesData?.MESSAGE ?? [];

  const filterSchema: FilterSchema = {
    ...(showCountry && {
      countryId: {
        label: "Country",
        operator: "equals",
        type: "select",
        field: "countryId",
        placeholder: "Select country",
        options: countries.map((c: any) => ({ label: c.name, value: c.id })),
      },
    }),
    ...(showState && {
      stateId: {
        label: "State",
        operator: "equals",
        type: "select",
        field: "stateId",
        placeholder: !draftCountryId
          ? "Select country first"
          : isStatesLoading
          ? "Loading states..."
          : states.length === 0
          ? "No states available"
          : "Select state",
        options: states.map((s: any) => ({ label: s.name, value: s.id })),
      },
    }),
    ...(showCity && {
      cityId: {
        label: "City",
        operator: "equals",
        type: "select",
        field: "cityId",
        placeholder: !draftStateId
          ? "Select state first"
          : isCitiesLoading
          ? "Loading cities..."
          : cities.length === 0
          ? "No cities available"
          : "Select city",
        options: cities.map((c: any) => ({ label: c.name, value: c.id })),
      },
    }),
    ...(showCityType && {
      cityTypeId: {
        label: "City Tier",
        operator: "equals",
        type: "select",
        field: "cityTypeId",
        placeholder: "All city tiers",
        options: cityTypes.map((t: any) => ({ label: `${t.name} (${t.code})`, value: t.id })),
      },
    }),
  };

  return { filterSchema, countries, states, cities, cityTypes };
}
