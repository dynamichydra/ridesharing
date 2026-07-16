import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getStateColumns } from "../components/state-column";
import { StateFormDialog } from "../components/state-dialog";
import { useCountries, useStates, useSetStateActive } from "../hooks";
import type { State } from "../types";

export default function StatesTab() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);

  const page = Number(controller.applied.page) || 1;
  const countryId = (controller.applied.countryId as string) || undefined;

  const { data: countriesData } = useCountries({ page: 1, limit: 100 });
  const countries = countriesData?.MESSAGE ?? [];

  const { data, isLoading, isFetching } = useStates({ countryId, page, limit: 20 });
  const setActiveMutation = useSetStateActive();

  const countriesMap = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [countries]);

  const filterSchema: FilterSchema = useMemo(
    () => ({
      countryId: {
        label: "Country",
        operator: "equals",
        type: "select",
        field: "countryId",
        placeholder: "All Countries",
        options: countries.map((c) => ({ label: c.name, value: c.id })),
      },
    }),
    [countries],
  );

  const handleAdd = useCallback(() => {
    setEditingState(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((state: State) => {
    setEditingState(state);
    setIsDialogOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (state: State) => {
      setActiveMutation.mutate({ id: state.id, isActive: !state.isActive });
    },
    [setActiveMutation],
  );

  const columns = useMemo(
    () => getStateColumns({ countriesMap, onEdit: handleEdit, onToggleActive: handleToggleActive }),
    [countriesMap, handleEdit, handleToggleActive],
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">States</h3>
          <p className="text-xs text-muted-foreground">{data?.COUNT ?? 0} states configured.</p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add State
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

      <StateFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        state={editingState}
        countries={countries}
        defaultCountryId={countryId}
      />
    </div>
  );
}
