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
import type { CommissionRule, Pagination } from "../types";

export default function CommissionRulesTab() {
  const controller = useFilterController({ page: 1, limit: 10 });
  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const [selected, setSelected] = useState<CommissionRule | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading, isFetching } = useCommissionRules({ page, limit });
  const { data: countriesData } = useCountryOptions();
  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const countries = countriesData?.MESSAGE || [];
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
    () => getCommissionRuleColumns({ onEdit: handleOpenEdit, onToggleActive: handleToggleActive, countries, vehicleTypes }),
    [countries, vehicleTypes],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Commission Rules</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} rules. Per-ride platform cut — a booking fee plus a % split, lower for drivers with
            an active subscription. Resolved most-specific first: exact country + vehicle type, then
            country-only, then the global default.
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
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
}
