import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { countriesApi, statesApi, citiesApi } from "./api";
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
} from "./types";

const COUNTRIES_KEY = "geo-countries";
const STATES_KEY = "geo-states";
const CITIES_KEY = "geo-cities";

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
