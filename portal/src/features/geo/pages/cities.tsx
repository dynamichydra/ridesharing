import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getCityColumns } from "../components/city-column";
import { CityFormDialog } from "../components/city-dialog";
import { useCountries, useStates, useCities, useSetCityActive } from "../hooks";
import type { City } from "../types";

export default function CitiesTab() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const page = Number(controller.applied.page) || 1;
  const countryId = (controller.applied.countryId as string) || undefined;
  const stateId = (controller.applied.stateId as string) || undefined;
  const search = (controller.applied.search as string) || undefined;

  const { data: countriesData } = useCountries({ page: 1, limit: 100 });
  const countries = countriesData?.MESSAGE ?? [];

  // Scope the state filter's own options to whichever country is currently applied.
  const { data: statesData } = useStates({ countryId, limit: 100 });
  const states = statesData?.MESSAGE ?? [];

  const { data, isLoading, isFetching } = useCities({ countryId, stateId, search, page, limit: 20 });
  const setActiveMutation = useSetCityActive();

  const countriesMap = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [countries]);

  const statesMap = useMemo(() => {
    const map = new Map<string, string>();
    states.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [states]);

  const filterSchema: FilterSchema = useMemo(
    () => ({
      search: {
        label: "Search",
        operator: "equals",
        type: "text",
        field: "search",
        placeholder: "Search cities by name...",
      },
      countryId: {
        label: "Country",
        operator: "equals",
        type: "select",
        field: "countryId",
        placeholder: "All Countries",
        options: countries.map((c) => ({ label: c.name, value: c.id })),
      },
      stateId: {
        label: "State",
        operator: "equals",
        type: "select",
        field: "stateId",
        placeholder: countryId ? "All States" : "Select a country first",
        options: states.map((s) => ({ label: s.name, value: s.id })),
      },
    }),
    [countries, states, countryId],
  );

  const handleAdd = useCallback(() => {
    setEditingCity(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((city: City) => {
    setEditingCity(city);
    setIsDialogOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (city: City) => {
      setActiveMutation.mutate({ id: city.id, isActive: !city.isActive });
    },
    [setActiveMutation],
  );

  const columns = useMemo(
    () =>
      getCityColumns({ countriesMap, statesMap, onEdit: handleEdit, onToggleActive: handleToggleActive }),
    [countriesMap, statesMap, handleEdit, handleToggleActive],
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Cities</h3>
          <p className="text-xs text-muted-foreground">{data?.COUNT ?? 0} cities configured.</p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add City
        </Button>
      </div>

      <AutoFilters
        schema={filterSchema}
        controller={controller}
        isFetching={isLoading}
        compact
        className="border-none shadow-none bg-accent/20"
      />

      <DataTable
        columns={columns}
        data={data?.MESSAGE ?? []}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={page - 1}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <CityFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        city={editingCity}
        countries={countries}
        defaultCountryId={countryId}
        defaultStateId={stateId}
      />
    </div>
  );
}
