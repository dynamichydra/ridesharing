import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";

import { getFareRuleColumns } from "../components/column";
import {
  ViewFareRuleDialog,
  FareRuleFormDialog,
  DeleteFareRuleDialog,
} from "../components/dialog";
import {
  useFareRules,
  useFareRule,
  useCreateFareRule,
  useUpdateFareRule,
  useDeleteFareRule,
  useCountryOptions,
  useVehicleTypeOptions,
  useZoneOptions,
} from "../hooks";
import type { FareRuleFormValues } from "../schema";
import type {
  FareRule,
  FareRulePayload,
  UpdateFareRulePayload,
  Pagination,
} from "../types";

const FARE_RULES_KEY = "fare-rules";

const EMPTY_FORM: FareRuleFormValues = {
  name: "",
  countryId: "",
  ruleType: "time",
  multiplier: 1,
  priority: 1,
  vehicleTypeId: "",
  zoneId: "",
  startTime: "",
  endTime: "",
  daysOfWeek: [],
  trafficDelayS: undefined,
  isActive: true,
};

function ruleToFormValues(rule: FareRule): FareRuleFormValues {
  return {
    name: rule.name,
    countryId: rule.countryId,
    ruleType: rule.ruleType,
    multiplier: Number(rule.multiplier),
    priority: rule.priority,
    vehicleTypeId: rule.vehicleTypeId,
    zoneId: rule.zoneId || "",
    startTime: rule.startTime || "",
    endTime: rule.endTime || "",
    daysOfWeek: rule.daysOfWeek || [],
    trafficDelayS: rule.trafficDelayS ?? undefined,
    isActive: rule.isActive,
  };
}

function buildPayload(values: FareRuleFormValues): FareRulePayload | UpdateFareRulePayload {
  const base = {
    name: values.name,
    countryId: values.countryId,
    ruleType: values.ruleType,
    multiplier: Number(values.multiplier),
    priority: Number(values.priority),
    vehicleTypeId: values.vehicleTypeId,
    isActive: values.isActive,
  };

  if (values.ruleType === "time") {
    return {
      ...base,
      startTime: values.startTime!,
      endTime: values.endTime!,
      daysOfWeek: values.daysOfWeek!,
    };
  }
  if (values.ruleType === "traffic") {
    return { ...base, trafficDelayS: Number(values.trafficDelayS) };
  }
  return { ...base, zoneId: values.zoneId! };
}

export default function FareRuleList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const [selectedRule, setSelectedRule] = useState<FareRule | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data, isLoading } = useFareRules({ page, limit: 10 });
  const { data: detailData, isLoading: isDetailLoading } = useFareRule(
    (isViewOpen || (isFormOpen && formMode === "edit")) ? selectedRule?.id : undefined
  );
  const createMutation = useCreateFareRule();
  const updateMutation = useUpdateFareRule();
  const deleteMutation = useDeleteFareRule();

  const { data: countriesData } = useCountryOptions();
  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const { data: zonesData } = useZoneOptions();
  const countries = countriesData?.MESSAGE || [];
  const vehicleTypes = vehicleTypesData?.MESSAGE || [];
  const zones = zonesData?.MESSAGE || [];

  const rules = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? rules.length;

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: [FARE_RULES_KEY], refetchType: "active" });
  };

  const handleOpenCreate = () => {
    setFormMode("create");
    setSelectedRule(null);
    setIsFormOpen(true);
  };

  const handleOpenView = (rule: FareRule) => {
    setSelectedRule(rule);
    setIsViewOpen(true);
  };

  const handleOpenEdit = (rule: FareRule) => {
    setFormMode("edit");
    setSelectedRule(rule);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (rule: FareRule) => {
    setSelectedRule(rule);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = (values: FareRuleFormValues) => {
    const payload = buildPayload(values);

    if (formMode === "create") {
      createMutation.mutate(payload as FareRulePayload, {
        onSuccess: () => {
          setIsFormOpen(false);
          refreshList();
        },
      });
    } else if (selectedRule) {
      updateMutation.mutate(
        { id: selectedRule.id, payload: payload as UpdateFareRulePayload },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            refreshList();
          },
        }
      );
    }
  };

  const handleDeleteConfirm = () => {
    if (!selectedRule) return;
    deleteMutation.mutate(selectedRule.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        refreshList();
      },
    });
  };

  const columns = useMemo(
    () =>
      getFareRuleColumns({
        onView: handleOpenView,
        onEdit: handleOpenEdit,
        onDelete: handleOpenDelete,
        countries,
        vehicleTypes,
        zones,
      }),
    [countries, vehicleTypes, zones]
  );

  const handlePageChange = (pageIndex: number) => {
    setPage(pageIndex + 1);
  };

  const editDefaults = formMode === "edit" && detailData?.MESSAGE
    ? ruleToFormValues(detailData.MESSAGE)
    : EMPTY_FORM;

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading fare rules…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Fare Rule Configurations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage dynamic pricing rules applied across ride matching and fare calculation.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="w-fit gap-2 px-3 shadow-sm font-medium cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Fare Rule
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={rules}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
        />
      </div>

      <ViewFareRuleDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        rule={detailData?.MESSAGE || null}
        isLoading={isDetailLoading}
        countries={countries}
        vehicleTypes={vehicleTypes}
        zones={zones}
      />

      <FareRuleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={formMode}
        defaultValues={editDefaults}
        isLoadingDefaults={formMode === "edit" && isDetailLoading}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        countries={countries}
        vehicleTypes={vehicleTypes}
        zones={zones}
      />

      <DeleteFareRuleDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        rule={selectedRule}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
