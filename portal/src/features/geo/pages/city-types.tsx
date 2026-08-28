import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getCityTypeColumns } from "../components/city-type-column";
import { CityTypeDialog } from "../components/city-type-dialog";
import { useCityTypes, useSetCityTypeActive, useSeedCityTypeDefaults } from "../hooks";
import type { CityType } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  search: {
    label: "Search",
    operator: "equals",
    type: "text",
    field: "search",
    placeholder: "Search tiers by name or code...",
  },
};

export default function CityTypesTab() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CityType | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 20;
  const search = (controller.applied.search as string) || undefined;

  const { data, isLoading, isFetching } = useCityTypes({ search, page, limit });
  const setActiveMutation = useSetCityTypeActive();
  const seedDefaultsMutation = useSeedCityTypeDefaults();

  const handleAdd = useCallback(() => {
    setEditingType(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((type: CityType) => {
    setEditingType(type);
    setIsDialogOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (type: CityType) => {
      setActiveMutation.mutate({ id: type.id, isActive: !type.isActive });
    },
    [setActiveMutation],
  );

  const columns = useMemo(
    () => getCityTypeColumns({ onEdit: handleEdit, onToggleActive: handleToggleActive }),
    [handleEdit, handleToggleActive],
  );

  const types = data?.MESSAGE ?? [];
  const pagination = data?.PAGINATION as any;
  const totalRecords = pagination?.total ?? pagination?.totalItems ?? types.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">City Types & Economic Tiers</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} city tiers configured. Sets baseline cost index, density search radius, and surge caps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {types.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" /> Seed Defaults
            </Button>
          )}
          <Button onClick={handleAdd} size="sm" className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" /> Add City Tier
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
        data={types}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={page - 1}
        onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <CityTypeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        typeToEdit={editingType}
      />
    </div>
  );
}
