import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/fullpage-loader";
import {
  useCreateSubscriptionPlan,
  useDeleteSubscriptionPlan,
  useSubscriptionPlans,
  useUpdateSubscriptionPlan,
  useVehicleTypeOptions,
} from "../hooks";
import { getSubscriptionPlanColumns } from "../column";
import { SubscriptionPlanFormDialog, SubscriptionPlanDeleteDialog } from "../dialog";
import {
  emptySubscriptionPlanFormValues,
  type SubscriptionPlanFormValues,
} from "../schema";
import type { SubscriptionPlan } from "../types";

export default function SubscriptionPlanList() {
  const [page, setPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planPendingDelete, setPlanPendingDelete] = useState<SubscriptionPlan | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data, isLoading } = useSubscriptionPlans({ page, limit: 10 });
  const { data: vehicleTypes = [] } = useVehicleTypeOptions();

  const createMutation = useCreateSubscriptionPlan();
  const updateMutation = useUpdateSubscriptionPlan();
  const deleteMutation = useDeleteSubscriptionPlan();

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

  const getDefaultValues = (): SubscriptionPlanFormValues => {
    if (!selectedPlan) return emptySubscriptionPlanFormValues;
    return {
      name: selectedPlan.name,
      type: selectedPlan.type,
      price: selectedPlan.price,
      durationDays: selectedPlan.durationDays?.toString() ?? "",
      trialDays: selectedPlan.trialDays.toString(),
      maxRidesPerDay: selectedPlan.maxRidesPerDay?.toString() ?? "",
      sortOrder: selectedPlan.sortOrder.toString(),
      isActive: selectedPlan.isActive,
      razorpayPlanId: selectedPlan.razorpayPlanId ?? "",
      featuresText: selectedPlan.features?.join(", ") ?? "",
      vehicleTypeIds: selectedPlan.vehicleTypeIds ?? [],
    };
  };

  const handleSubmit = (values: SubscriptionPlanFormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      price: values.price,
      durationDays: values.durationDays ? parseInt(values.durationDays, 10) : null,
      trialDays: parseInt(values.trialDays, 10) || 0,
      maxRidesPerDay: values.maxRidesPerDay ? parseInt(values.maxRidesPerDay, 10) : null,
      sortOrder: parseInt(values.sortOrder, 10) || 0,
      isActive: values.isActive,
      razorpayPlanId: values.razorpayPlanId || null,
      features: values.featuresText
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      vehicleTypeIds: values.vehicleTypeIds,
    };

    if (selectedPlan) {
      updateMutation.mutate(
        { id: selectedPlan.id, payload },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setSelectedPlan(null);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsFormOpen(false);
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
      },
    });
  };

  if (isLoading) return <Loader />;

  const plans = data?.data ?? [];
  const pagination = data?.pagination;
  const columns = getSubscriptionPlanColumns({ onEdit: handleOpenEdit, onDelete: handleOpenDelete });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Driver Subscriptions</h2>
          <p className="text-muted-foreground mt-1">
            Configure subscription packages, prices, and limits allowed for partner accounts.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Driver Onboarding Plans</CardTitle>
          <CardDescription>
            Configure packages driver partners must buy to match passenger dispatches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={`px-6 py-4 font-semibold ${col.className ?? ""}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                      No subscription plans found.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-6 py-4">
                          {col.render(plan)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Showing Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SubscriptionPlanFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedPlan(null);
        }}
        selectedPlan={selectedPlan}
        defaultValues={getDefaultValues()}
        vehicleTypes={vehicleTypes}
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