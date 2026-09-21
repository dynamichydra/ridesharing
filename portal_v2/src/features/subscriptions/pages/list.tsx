import { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Plus,
  Users,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

import { getSubscriptionPlanColumns } from "../components/column";
import { getSubscriberColumns } from "../components/subscribers-column";
import { SubscriptionPlanFormDialog } from "../components/dialog";
import { SubscriptionPlanDetailsDialog } from "../components/details-dialog";
import { PlanVersionsDialog } from "../components/plan-versions-dialog";
import { GroupPricingDialog } from "../components/group-pricing-dialog";
import { DriverSubscriptionDialog } from "../components/driver-subscription-dialog";
import {
  SubscriberActionDialog,
  type SubscriberActionType,
} from "../components/subscriber-action-dialog";

import {
  useSubscriptionPlans,
  useCountryOptions,
  useVehicleTypeOptions,
  useDriverGroupOptions,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useSetSubscriptionPlanActive,
  useSubscribers,
  useSubscriptionAnalytics,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  SUBSCRIBERS_KEY,
} from "../hooks";
import { emptySubscriptionPlanFormValues, type SubscriptionPlanFormValues } from "../schema";
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
  DriverSubscriber,
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
    allowedGroupIds: plan.allowedGroupIds ?? [],
    maxRidesPerDay: plan.maxRidesPerDay?.toString() ?? "",
    priorityMatching: plan.priorityMatching ?? false,
    entitlements: {
      commissionRatePercent:
        plan.entitlements?.commissionRate != null
          ? String(Number(plan.entitlements.commissionRate) * 100)
          : "",
      priorityScoreBonus:
        plan.entitlements?.priorityScoreBonus != null
          ? String(plan.entitlements.priorityScoreBonus)
          : "",
      freeInstantPayouts: Boolean(plan.entitlements?.freeInstantPayouts),
    },
    sortOrder: plan.sortOrder,
  };
}

function buildPayload(
  values: SubscriptionPlanFormValues
): CreateSubscriptionPlanPayload | UpdateSubscriptionPlanPayload {
  const entitlements: any = {};
  if (values.entitlements?.commissionRatePercent) {
    const rate = Number(values.entitlements.commissionRatePercent) / 100;
    if (!isNaN(rate)) entitlements.commissionRate = rate;
  }
  if (values.entitlements?.priorityScoreBonus) {
    const bonus = Number(values.entitlements.priorityScoreBonus);
    if (!isNaN(bonus)) entitlements.priorityScoreBonus = bonus;
  }
  if (values.entitlements?.freeInstantPayouts) {
    entitlements.freeInstantPayouts = true;
  }
  if (values.maxRidesPerDay) {
    entitlements.maxRidesPerDay = Number(values.maxRidesPerDay);
  }

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
    allowedGroupIds: values.allowedGroupIds && values.allowedGroupIds.length ? values.allowedGroupIds : null,
    maxRidesPerDay: values.maxRidesPerDay ? Number(values.maxRidesPerDay) : null,
    priorityMatching: values.priorityMatching,
    entitlements: Object.keys(entitlements).length > 0 ? entitlements : null,
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
  const [activeMainTab, setActiveMainTab] = useState<string>("plans");

  // Plans list filter controller
  const plansFilterController = useFilterController({ page: 1, limit: 10 });
  const plansPage = Number(plansFilterController.applied.page) || 1;
  const plansPageSize = Number(plansFilterController.applied.limit) || 10;

  // Subscribers list filter controller
  const subFilterController = useFilterController({ page: 1, limit: 10 });
  const subPage = Number(subFilterController.applied.page) || 1;
  const subPageSize = Number(subFilterController.applied.limit) || 10;
  const [subSearchInput, setSubSearchInput] = useState(subFilterController.applied.search || "");

  // Plan Modals State
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<SubscriptionPlan | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [pricingPlan, setPricingPlan] = useState<SubscriptionPlan | null>(null);
  const [versionsPlan, setVersionsPlan] = useState<SubscriptionPlan | null>(null);

  // Subscriber Modals State
  const [viewingSubscriber, setViewingSubscriber] = useState<DriverSubscriber | null>(null);
  const [isSubscriberDetailsOpen, setIsSubscriberDetailsOpen] = useState(false);
  const [actionSubscriber, setActionSubscriber] = useState<DriverSubscriber | null>(null);
  const [actionType, setActionType] = useState<SubscriberActionType | null>(null);

  // Analytics & Lookups
  const { data: analyticsData } = useSubscriptionAnalytics();
  const analytics = analyticsData?.MESSAGE;

  const { data: countriesData } = useCountryOptions();
  const countries = useMemo(() => countriesData?.MESSAGE || [], [countriesData]);

  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const vehicleTypes = useMemo(() => vehicleTypesData?.MESSAGE || [], [vehicleTypesData]);

  const { data: driverGroupsData } = useDriverGroupOptions();
  const driverGroups = useMemo(() => driverGroupsData || [], [driverGroupsData]);

  // Plans Query
  const { data: plansData, isLoading: isPlansLoading, isFetching: isPlansFetching } = useSubscriptionPlans({
    page: plansPage,
    limit: plansPageSize,
    countryId: plansFilterController.applied.countryId || undefined,
    isActive: toBool(plansFilterController.applied.isActive),
  });

  const createPlanMutation = useCreateSubscriptionPlan();
  const updatePlanMutation = useUpdateSubscriptionPlan();
  const setActivePlanMutation = useSetSubscriptionPlanActive();

  const plans = plansData?.MESSAGE || [];
  const plansPagination = plansData?.PAGINATION as unknown as Pagination | undefined;
  const totalPlanPages = plansPagination?.totalPages || 1;
  const totalPlanRecords = plansPagination?.totalItems ?? plans.length;

  // Subscribers Query
  const {
    data: subscribersData,
    isLoading: isSubscribersLoading,
    isFetching: isSubscribersFetching,
  } = useSubscribers({
    page: subPage,
    limit: subPageSize,
    countryId: subFilterController.applied.countryId || undefined,
    status: subFilterController.applied.status || undefined,
    search: subFilterController.applied.search || undefined,
  });

  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelMutation = useCancelSubscription();

  const subscribers = subscribersData?.MESSAGE || [];
  const subPagination = subscribersData?.PAGINATION as unknown as Pagination | undefined;
  const totalSubPages = subPagination?.totalPages || 1;
  const totalSubRecords = subPagination?.totalItems ?? subscribers.length;

  // Plan Handlers
  const refreshPlans = () => {
    queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_PLANS_KEY], refetchType: "active" });
  };

  const handleOpenCreatePlan = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  const handleOpenEditPlan = useCallback((plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  }, []);

  const handleOpenPlanDetails = useCallback((plan: SubscriptionPlan) => {
    setViewingPlan(plan);
    setIsDetailsOpen(true);
  }, []);

  const handleOpenPlanVersions = useCallback((plan: SubscriptionPlan) => {
    setVersionsPlan(plan);
  }, []);

  const handleTogglePlanActive = useCallback((plan: SubscriptionPlan) => {
    setActivePlanMutation.mutate({ id: plan.id, isActive: !plan.isActive });
  }, [setActivePlanMutation]);

  const defaultPlanValues: SubscriptionPlanFormValues = selectedPlan
    ? planToFormValues(selectedPlan)
    : emptySubscriptionPlanFormValues;

  const handlePlanSubmit = (values: SubscriptionPlanFormValues) => {
    const payload = buildPayload(values);

    if (selectedPlan) {
      updatePlanMutation.mutate(
        { id: selectedPlan.id, payload: payload as UpdateSubscriptionPlanPayload },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setSelectedPlan(null);
            refreshPlans();
          },
        }
      );
    } else {
      createPlanMutation.mutate(payload as CreateSubscriptionPlanPayload, {
        onSuccess: () => {
          setIsFormOpen(false);
          refreshPlans();
        },
      });
    }
  };

  // Subscriber Handlers
  const handleOpenSubscriberDetails = useCallback((subscriber: DriverSubscriber) => {
    setViewingSubscriber(subscriber);
    setIsSubscriberDetailsOpen(true);
  }, []);

  const handleOpenPauseSubscriber = useCallback((subscriber: DriverSubscriber) => {
    setActionSubscriber(subscriber);
    setActionType("pause");
  }, []);

  const handleOpenResumeSubscriber = useCallback((subscriber: DriverSubscriber) => {
    setActionSubscriber(subscriber);
    setActionType("resume");
  }, []);

  const handleOpenCancelSubscriber = useCallback((subscriber: DriverSubscriber) => {
    setActionSubscriber(subscriber);
    setActionType("cancel");
  }, []);

  const handleConfirmSubscriberAction = (reason?: string) => {
    if (!actionSubscriber || !actionType) return;

    if (actionType === "pause") {
      pauseMutation.mutate(
        { id: actionSubscriber.id, reason },
        {
          onSuccess: () => {
            setActionSubscriber(null);
            setActionType(null);
          },
        }
      );
    } else if (actionType === "resume") {
      resumeMutation.mutate(actionSubscriber.id, {
        onSuccess: () => {
          setActionSubscriber(null);
          setActionType(null);
        },
      });
    } else if (actionType === "cancel") {
      cancelMutation.mutate(
        { id: actionSubscriber.id, reason },
        {
          onSuccess: () => {
            setActionSubscriber(null);
            setActionType(null);
          },
        }
      );
    }
  };

  // Plan Columns
  const planColumns = useMemo(
    () =>
      getSubscriptionPlanColumns({
        onEdit: handleOpenEditPlan,
        onViewDetails: handleOpenPlanDetails,
        onViewVersions: handleOpenPlanVersions,
        onToggleActive: handleTogglePlanActive,
        onManageGroupPricing: (plan) => setPricingPlan(plan),
        countries,
      }),
    [countries, handleOpenEditPlan, handleOpenPlanDetails, handleOpenPlanVersions, handleTogglePlanActive]
  );

  // Subscriber Columns
  const subscriberColumns = useMemo(
    () =>
      getSubscriberColumns({
        onViewDetails: handleOpenSubscriberDetails,
        onPause: handleOpenPauseSubscriber,
        onResume: handleOpenResumeSubscriber,
        onCancel: handleOpenCancelSubscriber,
      }),
    [handleOpenSubscriberDetails, handleOpenPauseSubscriber, handleOpenResumeSubscriber, handleOpenCancelSubscriber]
  );

  // Plan Filters Schema
  const planFilterSchema: FilterSchema = useMemo(
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

  // Subscriber Filters Schema
  const subscriberFilterSchema: FilterSchema = useMemo(
    () => ({
      countryId: {
        label: "Country",
        operator: "equals",
        type: "select",
        field: "countryId",
        placeholder: "All Countries",
        options: countries.map((c) => ({ label: c.name, value: c.id })),
      },
      status: {
        label: "Status",
        operator: "equals",
        type: "select",
        field: "status",
        placeholder: "All Statuses",
        options: [
          { label: "Active", value: "active" },
          { label: "Trialing", value: "trialing" },
          { label: "Paused", value: "paused" },
          { label: "Past Due", value: "past_due" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Expired", value: "expired" },
        ],
      },
    }),
    [countries]
  );

  const handleSubSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    subFilterController.apply({ search: subSearchInput, page: 1 });
  };

  return (
    <div className="space-y-6">
      {/* KPI ANALYTICS TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Active Subscribers
              </span>
              <div className="text-2xl font-bold text-foreground">
                {analytics?.totalActive ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Active Plans
              </span>
              <div className="text-2xl font-bold text-foreground">
                {analytics?.totalPlans ?? totalPlanRecords}
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Expiring in 7 Days
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {analytics?.expiringSoon ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Past Due / Overdue
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {analytics?.pastDue ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN MODULE TABS */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="plans" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Subscription Plans</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-background font-semibold text-muted-foreground">
                {totalPlanRecords}
              </span>
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="gap-2">
              <Users className="h-4 w-4" />
              <span>Driver Subscribers</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-background font-semibold text-muted-foreground">
                {totalSubRecords}
              </span>
            </TabsTrigger>
          </TabsList>

          {activeMainTab === "plans" && (
            <Button
              onClick={handleOpenCreatePlan}
              size="sm"
              className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8"
            >
              <Plus className="h-4 w-4" />
              Add Plan
            </Button>
          )}

          {activeMainTab === "subscribers" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: [SUBSCRIBERS_KEY] })}
              className="gap-2 h-8"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          )}
        </div>

        {/* TAB 1: SUBSCRIPTION PLANS */}
        <TabsContent value="plans" className="space-y-4 outline-none">
          <AutoFilters
            schema={planFilterSchema}
            controller={plansFilterController}
            isFetching={isPlansLoading}
            compact={true}
            className="border-none shadow-none bg-accent/20"
          />

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <DataTable
              columns={planColumns}
              data={plans}
              pageIndex={plansPage - 1}
              pageSize={plansPageSize}
              pageCount={totalPlanPages}
              onPageChange={(pageIndex) => plansFilterController.apply({ page: pageIndex + 1 })}
              onPageSizeChange={(size) => plansFilterController.apply({ limit: size, page: 1 })}
              isLoading={isPlansLoading}
              isFetching={isPlansFetching}
            />
          </div>
        </TabsContent>

        {/* TAB 2: DRIVER SUBSCRIBERS */}
        <TabsContent value="subscribers" className="space-y-4 outline-none">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <form onSubmit={handleSubSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search driver name, phone, email..."
                  value={subSearchInput}
                  onChange={(e) => setSubSearchInput(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-9 px-3 text-xs">
                Search
              </Button>
            </form>

            <div className="flex-1">
              <AutoFilters
                schema={subscriberFilterSchema}
                controller={subFilterController}
                isFetching={isSubscribersLoading}
                compact={true}
                className="border-none shadow-none bg-transparent p-0 m-0"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <DataTable
              columns={subscriberColumns}
              data={subscribers}
              pageIndex={subPage - 1}
              pageSize={subPageSize}
              pageCount={totalSubPages}
              onPageChange={(pageIndex) => subFilterController.apply({ page: pageIndex + 1 })}
              onPageSizeChange={(size) => subFilterController.apply({ limit: size, page: 1 })}
              isLoading={isSubscribersLoading}
              isFetching={isSubscribersFetching}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* PLAN DIALOGS */}
      <SubscriptionPlanFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedPlan(null);
        }}
        selectedPlan={selectedPlan}
        defaultValues={defaultPlanValues}
        countries={countries}
        vehicleTypes={vehicleTypes}
        driverGroups={driverGroups}
        isSaving={createPlanMutation.isPending || updatePlanMutation.isPending}
        onSubmit={handlePlanSubmit}
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

      <PlanVersionsDialog
        open={Boolean(versionsPlan)}
        onOpenChange={(open) => {
          if (!open) setVersionsPlan(null);
        }}
        plan={versionsPlan}
      />

      <GroupPricingDialog
        open={Boolean(pricingPlan)}
        onOpenChange={(open) => {
          if (!open) setPricingPlan(null);
        }}
        plan={pricingPlan}
      />

      {/* SUBSCRIBER DIALOGS */}
      <DriverSubscriptionDialog
        open={isSubscriberDetailsOpen}
        onOpenChange={(open) => {
          setIsSubscriberDetailsOpen(open);
          if (!open) setViewingSubscriber(null);
        }}
        subscriber={viewingSubscriber}
      />

      <SubscriberActionDialog
        open={Boolean(actionSubscriber && actionType)}
        onOpenChange={(open) => {
          if (!open) {
            setActionSubscriber(null);
            setActionType(null);
          }
        }}
        subscriber={actionSubscriber}
        actionType={actionType}
        isLoading={pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending}
        onConfirm={handleConfirmSubscriberAction}
      />
    </div>
  );
}
