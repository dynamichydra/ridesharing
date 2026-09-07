import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getCommissionRuleColumns } from "../components/commission-rule-column";
import { CommissionRuleFormDialog } from "../components/commission-rule-dialog";
import {
  useCommissionRules,
  useSetCommissionRuleActive,
  useCountryOptions,
  useVehicleTypeOptions,
} from "../hooks";
import { useCities } from "@/features/geo/hooks";
import type { CommissionRule, Pagination, LookupOption } from "../types";

export default function CommissionRulesTab() {
  const controller = useFilterController({ page: 1, limit: 10 });
  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const [selected, setSelected] = useState<CommissionRule | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading, isFetching } = useCommissionRules({ page, limit });
  const { data: countriesData } = useCountryOptions();
  const { data: citiesData } = useCities({ limit: 500 });
  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const countries = countriesData?.MESSAGE || [];
  const rawCities = (citiesData?.MESSAGE || []) as Array<{ id: string; name: string; countryId?: string }>;
  const cities: (LookupOption & { countryId?: string })[] = useMemo(
    () => rawCities.map((c) => ({ id: c.id, name: c.name, countryId: c.countryId })),
    [rawCities],
  );
  const vehicleTypes = vehicleTypesData?.MESSAGE || [];

  const setActiveMutation = useSetCommissionRuleActive();

  const rules = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? rules.length;

  const handleOpenCreate = () => {
    setMode("create");
    setSelected(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: CommissionRule) => {
    setMode("edit");
    setSelected(rule);
    setIsFormOpen(true);
  };

  const handleToggleActive = (rule: CommissionRule) => {
    setActiveMutation.mutate({ id: rule.id, isActive: !rule.isActive });
  };

  const columns = useMemo(
    () => getCommissionRuleColumns({ onEdit: handleOpenEdit, onToggleActive: handleToggleActive, countries, cities, vehicleTypes }),
    [countries, cities, vehicleTypes],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Commission Rules</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} rules. Dynamic per-ride platform cut — booking fee, % split (discounted for active subscribers),
            and optional floor/ceiling caps. Resolved top-down: City + Vehicle Type &rarr; City Default &rarr; Country + Vehicle Type &rarr; Country Default &rarr; Global Default.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add Commission Rule
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={rules}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <CommissionRuleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={mode}
        rule={selected}
        countries={countries}
        cities={cities}
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
}
