import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getCurrencyColumns } from "../components/currency-column";
import { CurrencyDialog } from "../components/currency-dialog";
import { useCurrencies, useSetCurrencyActive, useSeedCurrencies } from "../hooks";
import type { Currency } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  search: {
    label: "Search",
    operator: "equals",
    type: "text",
    field: "search",
    placeholder: "Search by code, symbol, or name...",
  },
};

export default function CurrenciesTab() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 20;
  const search = (controller.applied.search as string) || undefined;

  const { data, isLoading, isFetching } = useCurrencies({ search, page, limit });
  const setActiveMutation = useSetCurrencyActive();
  const seedDefaultsMutation = useSeedCurrencies();

  const handleAdd = useCallback(() => {
    setEditingCurrency(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((currency: Currency) => {
    setEditingCurrency(currency);
    setIsDialogOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (currency: Currency) => {
      setActiveMutation.mutate({ id: currency.id, isActive: !currency.isActive });
    },
    [setActiveMutation],
  );

  const columns = useMemo(
    () => getCurrencyColumns({ onEdit: handleEdit, onToggleActive: handleToggleActive }),
    [handleEdit, handleToggleActive],
  );

  const currencies = data?.MESSAGE ?? [];
  const totalRecords = (data?.PAGINATION as any)?.total ?? currencies.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Currencies Master</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} currencies configured. Standardizes ISO codes, display symbols, and minor unit decimal places for country ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currencies.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" /> Seed ISO Defaults
            </Button>
          )}
          <Button onClick={handleAdd} size="sm" className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" /> Add Currency
          </Button>
        </div>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact
        className="border-none shadow-none bg-accent/20"
      />

      <DataTable
        columns={columns}
        data={currencies}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={page - 1}
        onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <CurrencyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        currencyToEdit={editingCurrency}
      />
    </div>
  );
}
