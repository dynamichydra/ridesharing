import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { useFilterController } from "@/components/filters/useFilterController";

import { getCountryColumns } from "../components/country-column";
import { CountryFormDialog } from "../components/country-dialog";
import { useCountries, useSetCountryActive, useCurrencyOptions } from "../hooks";
import type { Country } from "../types";
import { Plus } from "lucide-react";

export default function CountriesTab() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);

  const page = Number(controller.applied.page) || 1;
  const { data, isLoading, isFetching } = useCountries({ page, limit: 20 });
  const setActiveMutation = useSetCountryActive();

  const { data: currenciesData } = useCurrencyOptions();
  const currencies = currenciesData?.MESSAGE ?? [];

  const currenciesMap = useMemo(() => {
    const map = new Map<string, { symbol: string; name: string }>();
    currencies.forEach((c) => map.set(c.code, { symbol: c.symbol, name: c.name }));
    return map;
  }, [currencies]);

  const handleAdd = useCallback(() => {
    setEditingCountry(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((country: Country) => {
    setEditingCountry(country);
    setIsDialogOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (country: Country) => {
      setActiveMutation.mutate({ id: country.id, isActive: !country.isActive });
    },
    [setActiveMutation],
  );

  const columns = useMemo(
    () => getCountryColumns({ currenciesMap, onEdit: handleEdit, onToggleActive: handleToggleActive }),
    [currenciesMap, handleEdit, handleToggleActive],
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Countries</h3>
          <p className="text-xs text-muted-foreground">
            {data?.COUNT ?? 0} countries configured. Exactly one should be marked as default.
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add Country
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.MESSAGE ?? []}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={page - 1}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <CountryFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        country={editingCountry}
        currencies={currencies}
      />
    </div>
  );
}

