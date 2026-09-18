import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";
import { getPricingVersionColumns } from "../components/column";
import { PricingVersionFilters } from "../components/filters";
import { PricingVersionFormDialog } from "../components/dialog";
import {
  usePricingVersions,
  useCreatePricingVersion,
  useUpdatePricingVersion,
  useTogglePricingVersionActive,
} from "../hooks";
import { useCountryOptions, useCurrencyOptions, useCities } from "@/features/geo/hooks";
import { useVehicleTypes } from "@/features/vehicle-types/hooks";
import { useAllZones } from "@/features/zones/hooks";
import type { PricingVersion } from "../types";
import { pricingVersionSchema, type PricingVersionFormValues } from "../schema";
import { z } from "zod";

const QUERY_KEY = ["pricing-versions"];

const defaultValues: PricingVersionFormValues = {
  countryId: null,
  currencyId: null,
  vehicleTypeId: null,
  cityTypeId: null,
  cityId: null,
  zoneId: null,
  baseFareMinor: 500,
  minFareMinor: 700,
  perKmRateMinor: 150,
  perMinRateMinor: 25,
  waitingPricePerMinMinor: 0,
  waitingGracePeriodMin: 3,
  bookingFeeMinor: 0,
  serviceFeeMinor: 0,
  cancellationFeeMinor: 0,
  noShowFeeMinor: 0,
  airportFeeMinor: 0,
  tollFeeMinor: 0,
  taxPercentage: "0.00",
  surgeFloorMultiplier: "1.00",
  surgeCapMultiplier: "3.00",
  isActive: true,
};

export default function PricingVersionsList() {
  const queryClient = useQueryClient();
  const { draft, applied, setDraftValue, apply, reset } = useFilterController({ page: 1 });
  const [pageSize, setPageSize] = useState(10);

  const { page: appliedPageStr, ...filterParams } = applied;
  const page = Number(appliedPageStr ?? 1);

  const { data: response, isLoading, isFetching } = usePricingVersions({
    ...filterParams,
    page,
    limit: pageSize,
  });

  const pricingVersions = response?.MESSAGE || [];
  const pagination = response?.PAGINATION as unknown as { totalPages?: number; totalItems?: number } | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? (response?.COUNT ?? pricingVersions.length);

  // Lookups for scope dropdowns and table resolution
  const { data: countriesData } = useCountryOptions();
  const { data: currenciesData } = useCurrencyOptions();
  const { data: vehicleTypesData } = useVehicleTypes({ all: "true" });
  const { data: citiesData } = useCities({ limit: 500 });
  const { data: zonesData } = useAllZones();

  const countries = useMemo(() => (countriesData?.MESSAGE as any[]) || [], [countriesData]);
  const currencies = useMemo(() => (currenciesData?.MESSAGE as any[]) || [], [currenciesData]);
  const vehicleTypes = useMemo(() => (vehicleTypesData?.MESSAGE as any[]) || [], [vehicleTypesData]);
  const cities = useMemo(() => (citiesData?.MESSAGE as any[]) || [], [citiesData]);
  const zones = useMemo(() => (zonesData?.MESSAGE as any[]) || [], [zonesData]);

  const vehicleTypeNameById = useMemo(
    () => Object.fromEntries(vehicleTypes.map((v) => [v.id, v.name])),
    [vehicleTypes]
  );
  const countryNameById = useMemo(
    () => Object.fromEntries(countries.map((c) => [c.id, c.name])),
    [countries]
  );
  const cityNameById = useMemo(
    () => Object.fromEntries(cities.map((c) => [c.id, c.name])),
    [cities]
  );
  const zoneNameById = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z.name])),
    [zones]
  );

  const createMutation = useCreatePricingVersion();
  const updateMutation = useUpdatePricingVersion();
  const toggleMutation = useTogglePricingVersionActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<PricingVersion | null>(null);

  const [formValues, setFormValues] = useState<PricingVersionFormValues>(defaultValues);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PricingVersionFormValues, string>>>({});

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: "active" });
  };

  const handleCreate = () => {
    setDialogMode("create");
    setSelectedItem(null);
    setFormValues(defaultValues);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (pv: PricingVersion) => {
    setDialogMode("edit");
    setSelectedItem(pv);
    setFormValues({
      countryId: pv.countryId ?? null,
      currencyId: pv.currencyId ?? null,
      vehicleTypeId: pv.vehicleTypeId ?? null,
      cityTypeId: (pv as any).cityTypeId ?? null,
      cityId: pv.cityId ?? null,
      zoneId: pv.zoneId ?? null,
      baseFareMinor: pv.baseFareMinor,
      minFareMinor: pv.minFareMinor,
      perKmRateMinor: pv.perKmRateMinor,
      perMinRateMinor: pv.perMinRateMinor,
      waitingPricePerMinMinor: pv.waitingPricePerMinMinor ?? 0,
      waitingGracePeriodMin: (pv as any).waitingGracePeriodMin ?? 3,
      bookingFeeMinor: pv.bookingFeeMinor ?? 0,
      serviceFeeMinor: (pv as any).serviceFeeMinor ?? 0,
      cancellationFeeMinor: pv.cancellationFeeMinor ?? 0,
      noShowFeeMinor: pv.noShowFeeMinor ?? 0,
      airportFeeMinor: pv.airportFeeMinor ?? 0,
      tollFeeMinor: pv.tollFeeMinor ?? 0,
      taxPercentage: pv.taxPercentage ?? "0.00",
      surgeFloorMultiplier: pv.surgeFloorMultiplier ?? "1.00",
      surgeCapMultiplier: pv.surgeCapMultiplier ?? "3.00",
      isActive: pv.isActive,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleToggleActive = (pv: PricingVersion) => {
    if (confirm(`Are you sure you want to ${pv.isActive ? "disable" : "enable"} this pricing version?`)) {
      toggleMutation.mutate(
        { id: pv.id, isActive: !pv.isActive },
        { onSuccess: refreshList }
      );
    }
  };

  const validateForm = () => {
    try {
      pricingVersionSchema.parse(formValues);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: any = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (dialogMode === "create") {
      createMutation.mutate(formValues, {
        onSuccess: () => {
          setDialogOpen(false);
          refreshList();
        },
      });
    } else if (selectedItem) {
      updateMutation.mutate(
        {
          id: selectedItem.id,
          payload: formValues,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            refreshList();
          },
        }
      );
    }
  };

  const columns = useMemo(
    () =>
      getPricingVersionColumns({
        onEdit: handleEdit,
        onToggleActive: handleToggleActive,
        vehicleTypeNameById,
        countryNameById,
        cityNameById,
        zoneNameById,
      }),
    [
      handleEdit,
      handleToggleActive,
      vehicleTypeNameById,
      countryNameById,
      cityNameById,
      zoneNameById,
    ]
  );

  const handlePageChange = (pageIndex: number) => {
    apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Tag className="h-5 w-5 text-primary" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
              Pricing Versions
            </h2>

            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
              {totalRecords} Total
            </span>
          </div>

          <Button
            onClick={handleCreate}
            size="sm"
            className="gap-2 h-8 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Pricing Version
          </Button>
        </div>
      </div>

      <PricingVersionFilters
        controller={{ draft, applied, setDraftValue, apply, reset }}
        isFetching={isFetching}
        vehicleTypes={vehicleTypes}
        countries={countries}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={pricingVersions}
          pageIndex={page - 1}
          pageSize={pageSize}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => {
            setPageSize(size);
            apply({ page: 1 });
          }}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <PricingVersionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        values={formValues}
        setValues={setFormValues}
        errors={formErrors}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        lookups={{
          countries,
          currencies,
          vehicleTypes,
          cities,
          zones,
        }}
      />
    </div>
  );
}
