import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getFareRuleColumns } from "../components/column";
import {
  ViewFareRuleDialog,
  FareRuleFormDialog,
} from "../components/dialog";
import {
  useFareRules,
  useFareRule,
  useCreateFareRule,
  useUpdateFareRule,
  useSetFareRuleActive,
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

const FILTER_SCHEMA: FilterSchema = {
  ruleType: {
    label: "Rule Type",
    operator: "equals",
    type: "select",
    field: "ruleType",
    placeholder: "All Types",
    options: [
      { label: "Time-based", value: "time" },
      { label: "Traffic-based", value: "traffic" },
      { label: "Zone-based", value: "zone" },
    ],
  },
  isActive: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "isActive",
    placeholder: "All Statuses",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
};

function toBool(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default function FareRuleList() {
  const queryClient = useQueryClient();
  const controller = useFilterController({ page: 1, limit: 10 });
  const page = Number(controller.applied.page) || 1;
  const pageSize = Number(controller.applied.limit) || 10;

  const [selectedRule, setSelectedRule] = useState<FareRule | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  const { data, isLoading, isFetching } = useFareRules({
    page,
    limit: pageSize,
    ruleType: (controller.applied.ruleType as FareRule["ruleType"]) || "",
    isActive: toBool(controller.applied.isActive),
  });
  const { data: detailData, isLoading: isDetailLoading } = useFareRule(
    (isViewOpen || (isFormOpen && formMode === "edit")) ? selectedRule?.id : undefined
  );
  const createMutation = useCreateFareRule();
  const updateMutation = useUpdateFareRule();
  const setActiveMutation = useSetFareRuleActive();

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

  const handleToggleActive = (rule: FareRule) => {
    setActiveMutation.mutate({ id: rule.id, isActive: !rule.isActive });
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

  const columns = useMemo(
    () =>
      getFareRuleColumns({
        onView: handleOpenView,
        onEdit: handleOpenEdit,
        onToggleActive: handleToggleActive,
        countries,
        vehicleTypes,
        zones,
      }),
    [countries, vehicleTypes, zones]
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  const editDefaults = formMode === "edit" && detailData?.MESSAGE
    ? ruleToFormValues(detailData.MESSAGE)
    : EMPTY_FORM;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Fare Rules
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Total
          </span>
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8"
        >
          <Plus className="h-4 w-4" />
          Add Fare Rule
        </Button>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={rules}
          pageIndex={page - 1}
          pageSize={pageSize}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
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
    </div>
  );
}
