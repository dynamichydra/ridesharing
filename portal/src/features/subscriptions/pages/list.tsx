import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";

import { getSubscriptionPlanColumns } from "../components/column";
import { SubscriptionPlanFormDialog, SubscriptionPlanDeleteDialog } from "../components/dialog";
import {
  useSubscriptionPlans,
  useCountryOptions,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useDeleteSubscriptionPlan,
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
    featuresText: plan.features?.join(", ") ?? "",
    maxRidesPerDay: plan.maxRidesPerDay?.toString() ?? "",
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
    features: values.featuresText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean),
    maxRidesPerDay: values.maxRidesPerDay ? Number(values.maxRidesPerDay) : null,
    sortOrder: Number(values.sortOrder),
  };
}

export default function SubscriptionPlanList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planPendingDelete, setPlanPendingDelete] = useState<SubscriptionPlan | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data, isLoading } = useSubscriptionPlans({ page, limit: 10 });
  const { data: countriesData } = useCountryOptions();
  const countries = countriesData?.MESSAGE || [];

  const createMutation = useCreateSubscriptionPlan();
  const updateMutation = useUpdateSubscriptionPlan();
  const deleteMutation = useDeleteSubscriptionPlan();

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

  const handleOpenDelete = (plan: SubscriptionPlan) => {
    setPlanPendingDelete(plan);
    setIsDeleteOpen(true);
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

  const handleConfirmDelete = () => {
    if (!planPendingDelete) return;
    deleteMutation.mutate(planPendingDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setPlanPendingDelete(null);
        refreshList();
      },
    });
  };

  const columns = useMemo(
    () => getSubscriptionPlanColumns({ onEdit: handleOpenEdit, onDelete: handleOpenDelete, countries }),
    [countries]
  );

  const handlePageChange = (pageIndex: number) => {
    setPage(pageIndex + 1);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading subscription plans…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={plans}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
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
        isSaving={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <SubscriptionPlanDeleteDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setPlanPendingDelete(null);
        }}
        plan={planPendingDelete}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
