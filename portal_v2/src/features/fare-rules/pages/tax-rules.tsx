import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getTaxRuleColumns } from "../components/tax-rule-column";
import { TaxRuleFormDialog } from "../components/tax-rule-dialog";
import { useTaxRules, useUpdateTaxRule, useDisableTaxRule, useCountryOptions } from "../hooks";
import type { TaxRule, Pagination } from "../types";

export default function TaxRulesTab() {
  const controller = useFilterController({ page: 1, limit: 10 });
  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const [selected, setSelected] = useState<TaxRule | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading, isFetching } = useTaxRules({ page, limit });
  const { data: countriesData } = useCountryOptions();
  const countries = countriesData?.MESSAGE || [];

  const updateMutation = useUpdateTaxRule();
  const disableMutation = useDisableTaxRule();

  const taxRules = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? taxRules.length;

  const handleOpenCreate = () => {
    setMode("create");
    setSelected(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: TaxRule) => {
    setMode("edit");
    setSelected(rule);
    setIsFormOpen(true);
  };

  const handleToggleActive = (rule: TaxRule) => {
    if (rule.isActive) {
      disableMutation.mutate(rule.id);
    } else {
      updateMutation.mutate({ id: rule.id, payload: { isActive: true } });
    }
  };

  const columns = useMemo(
    () => getTaxRuleColumns({ onEdit: handleOpenEdit, onToggleActive: handleToggleActive, countries }),
    [countries],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tax Rules</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} tax rules. Applied on top of the base fare/subscription price by country.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add Tax Rule
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={taxRules}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <TaxRuleFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} mode={mode} taxRule={selected} countries={countries} />
    </div>
  );
}
