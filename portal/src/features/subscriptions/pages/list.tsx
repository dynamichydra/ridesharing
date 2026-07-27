import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getSubscriptionPlanColumns } from "../components/column";
import { SubscriptionPlanFormDialog } from "../components/dialog";
import { SubscriptionPlanDetailsDialog } from "../components/details-dialog";
import {
  useSubscriptionPlans,
  useCountryOptions,
  useVehicleTypeOptions,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useSetSubscriptionPlanActive,
} from "../hooks";
import { emptySubscriptionPlanFormValues, type SubscriptionPlanFormValues } from "../schema";
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
  Pagination,
} from "../types";

const SUBSCRIPTION_PLANS_KEY = "subscription-plans";

function planToFormValues(plan: SubscriptionPlan): SubscriptionPlanFormValues {
  return {
    name: plan.name,
    countryId: plan.countryId,
    type: plan.type,
    currencyCode: plan.currencyCode,
    priceMinor: plan.priceMinor,
    durationDays: plan.durationDays?.toString() ?? "",
    trialDays: plan.trialDays,
    features: plan.features ?? [],
    vehicleTypeIds: plan.vehicleTypeIds ?? [],
    maxRidesPerDay: plan.maxRidesPerDay?.toString() ?? "",
    priorityMatching: plan.priorityMatching ?? false,
    sortOrder: plan.sortOrder,
  };
}

function buildPayload(
  values: SubscriptionPlanFormValues
): CreateSubscriptionPlanPayload | UpdateSubscriptionPlanPayload {
  return {
    name: values.name,
    countryId: values.countryId,
    type: values.type,
    currencyCode: values.currencyCode,
    priceMinor: Number(values.priceMinor),
    durationDays: values.type === "lifetime" ? null : values.durationDays ? Number(values.durationDays) : null,
    trialDays: Number(values.trialDays) || 0,
    features: values.features,
    vehicleTypeIds: values.vehicleTypeIds.length ? values.vehicleTypeIds : null,
    maxRidesPerDay: values.maxRidesPerDay ? Number(values.maxRidesPerDay) : null,
    priorityMatching: values.priorityMatching,
    sortOrder: Number(values.sortOrder),
  };
}

function toBool(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default function SubscriptionPlanList() {
  const queryClient = useQueryClient();
  const controller = useFilterController({ page: 1, limit: 10 });
  const page = Number(controller.applied.page) || 1;
  const pageSize = Number(controller.applied.limit) || 10;

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<SubscriptionPlan | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: countriesData } = useCountryOptions();
  const countries = countriesData?.MESSAGE || [];

  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const vehicleTypes = vehicleTypesData?.MESSAGE || [];

  const { data, isLoading, isFetching } = useSubscriptionPlans({
    page,
    limit: pageSize,
    countryId: controller.applied.countryId || undefined,
    isActive: toBool(controller.applied.isActive),
  });

  const createMutation = useCreateSubscriptionPlan();
  const updateMutation = useUpdateSubscriptionPlan();
  const setActiveMutation = useSetSubscriptionPlanActive();

  const plans = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? plans.length;

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_PLANS_KEY], refetchType: "active" });
  };

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (plan: SubscriptionPlan) => {
    setViewingPlan(plan);
    setIsDetailsOpen(true);
  };

  const handleToggleActive = (plan: SubscriptionPlan) => {
    setActiveMutation.mutate({ id: plan.id, isActive: !plan.isActive });
  };

  const defaultValues: SubscriptionPlanFormValues = selectedPlan
    ? planToFormValues(selectedPlan)
    : emptySubscriptionPlanFormValues;

  const handleSubmit = (values: SubscriptionPlanFormValues) => {
    const payload = buildPayload(values);

    if (selectedPlan) {
      updateMutation.mutate(
        { id: selectedPlan.id, payload: payload as UpdateSubscriptionPlanPayload },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setSelectedPlan(null);
            refreshList();
          },
        }
      );
    } else {
      createMutation.mutate(payload as CreateSubscriptionPlanPayload, {
        onSuccess: () => {
          setIsFormOpen(false);
          refreshList();
        },
      });
    }
  };

  const columns = useMemo(
    () =>
      getSubscriptionPlanColumns({
        onEdit: handleOpenEdit,
        onViewDetails: handleOpenDetails,
        onToggleActive: handleToggleActive,
        countries,
      }),
    [countries]
  );

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
    }),
    [countries]
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Subscription Plans
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Total
          </span>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8"
        >
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <AutoFilters
        schema={filterSchema}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={plans}
          pageIndex={page - 1}
          pageSize={pageSize}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <SubscriptionPlanFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedPlan(null);
        }}
        selectedPlan={selectedPlan}
        defaultValues={defaultValues}
        countries={countries}
        vehicleTypes={vehicleTypes}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <SubscriptionPlanDetailsDialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setViewingPlan(null);
        }}
        plan={viewingPlan}
        countries={countries}
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
}
