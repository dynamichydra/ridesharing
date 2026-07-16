import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getVehicleTypeColumns } from "../components/column";
import { VehicleTypeFilters } from "../components/filters";
import {
  VehicleTypeFormDialog,
  DeleteVehicleTypeDialog,
  PricingFormDialog,
} from "../components/dialog";
import {
  useVehicleTypes,
  useCreateVehicleType,
  useUpdateVehicleType,
  useDeleteVehicleType,
  useCountries,
  useVehicleTypePricingForCountry,
  useSetVehicleTypePricing,
} from "../hooks";
import {
  vehicleTypeCreateSchema,
  vehicleTypeEditSchema,
  vehicleTypePricingSchema,
  type VehicleTypeFormValues,
  type VehicleTypePricingFormValues,
} from "../schema";
import type { VehicleType, VehicleTypePricing, Pagination } from "../types";

const VEHICLE_TYPES_KEY = "vehicle-types";

const EMPTY_FORM: VehicleTypeFormValues = {
  name: "",
  capacity: "",
  sortOrder: "",
  isActive: true,
};

const EMPTY_PRICING_FORM: VehicleTypePricingFormValues = {
  currencyCode: "",
  baseRate: "",
  perKmRate: "",
  perMinRate: "",
  minFare: "",
};

export default function VehicleTypeList() {
  const queryClient = useQueryClient();
  const { draft, applied, setDraftValue, apply, reset } = useFilterController({ page: 1 });

  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<VehicleTypeFormValues>(EMPTY_FORM);
const [formErrors, setFormErrors] = useState<
  Partial<Record<keyof VehicleTypeFormValues, string>>
>({});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [pricingVehicleType, setPricingVehicleType] = useState<VehicleType | null>(null);
  const [pricingValues, setPricingValues] =
    useState<VehicleTypePricingFormValues>(EMPTY_PRICING_FORM);
const [pricingErrors, setPricingErrors] = useState<
  Partial<Record<keyof VehicleTypePricingFormValues, string>>
>({});

  // countryId is UI-only context for the pricing join — never sent to
  // GET /vehicle-types, which the API doc doesn't confirm supports it.
  const { countryId: selectedCountryId, page: appliedPageStr, ...vehicleTypeFilterParams } =
    applied;
  const page = Number(appliedPageStr ?? 1);

  const { data, isLoading, isFetching } = useVehicleTypes({
    ...vehicleTypeFilterParams,
    page,
    limit: 10,
  });
  const { data: countriesData } = useCountries();
  const { data: pricingData } = useVehicleTypePricingForCountry(selectedCountryId || undefined);

  const createMutation = useCreateVehicleType();
  const updateMutation = useUpdateVehicleType();
  const deleteMutation = useDeleteVehicleType();
  const setPricingMutation = useSetVehicleTypePricing();

  const vehicleTypes = data?.MESSAGE || [];
  const countries = countriesData?.MESSAGE || [];
  const selectedCountry = countries.find((c) => c.id === selectedCountryId);

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? vehicleTypes.length;

  const pricingMap = useMemo(() => {
    const rows = (pricingData?.MESSAGE ?? []) as VehicleTypePricing[];
    const map: Record<string, VehicleTypePricing> = {};
    rows.forEach((row) => {
      map[row.vehicleTypeId] = row;
    });
    return map;
  }, [pricingData]);

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY], refetchType: "active" });
  };

  const handleOpenCreate = () => {
    setFormMode("create");
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setSelectedVehicleType(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (vt: VehicleType) => {
    setFormMode("edit");
    setSelectedVehicleType(vt);
    setFormValues({
      name: vt.name,
      capacity: vt.capacity,
      sortOrder: vt.sortOrder,
      isActive: vt.isActive,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDelete = (vt: VehicleType) => {
    setSelectedVehicleType(vt);
    setIsDeleteOpen(true);
  };

  const handleOpenPricing = (vt: VehicleType) => {
    const existing = pricingMap[vt.id];
    setPricingVehicleType(vt);
    setPricingValues(
      existing
        ? {
            currencyCode: existing.currencyCode,
            baseRate: (existing.baseRateMinor / 100).toFixed(2),
            perKmRate: (existing.perKmRateMinor / 100).toFixed(2),
            perMinRate: (existing.perMinRateMinor / 100).toFixed(2),
            minFare: (existing.minFareMinor / 100).toFixed(2),
          }
        : { ...EMPTY_PRICING_FORM, currencyCode: selectedCountry?.currencyCode ?? "" }
    );
    setPricingErrors({});
    setIsPricingOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formMode === "create") {
      const result = vehicleTypeCreateSchema.safeParse(formValues);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof VehicleTypeFormValues, string>> = {};
        result.error.issues.forEach((issue) => {
          fieldErrors[issue.path[0] as keyof VehicleTypeFormValues] = issue.message;
        });
        setFormErrors(fieldErrors);
        return;
      }
      setFormErrors({});
      createMutation.mutate(result.data, {
        onSuccess: () => {
          setIsFormOpen(false);
          refreshList();
        },
      });
    } else if (selectedVehicleType) {
      const result = vehicleTypeEditSchema.safeParse({
        capacity: formValues.capacity,
        isActive: formValues.isActive,
      });
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof VehicleTypeFormValues, string>> = {};
        result.error.issues.forEach((issue) => {
          fieldErrors[issue.path[0] as keyof VehicleTypeFormValues] = issue.message;
        });
        setFormErrors(fieldErrors);
        return;
      }
      setFormErrors({});
      updateMutation.mutate(
        { id: selectedVehicleType.id, payload: result.data },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            refreshList();
          },
        }
      );
    }
  };

  const handlePricingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingVehicleType || !selectedCountryId) return;

    const result = vehicleTypePricingSchema.safeParse(pricingValues);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof VehicleTypePricingFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as keyof VehicleTypePricingFormValues] = issue.message;
      });
      setPricingErrors(fieldErrors);
      return;
    }
    setPricingErrors({});

    setPricingMutation.mutate(
      {
        vehicleTypeId: pricingVehicleType.id,
        payload: {
          countryId: selectedCountryId,
          currencyCode: result.data.currencyCode,
          baseRateMinor: Math.round(Number(result.data.baseRate) * 100),
          perKmRateMinor: Math.round(Number(result.data.perKmRate) * 100),
          perMinRateMinor: Math.round(Number(result.data.perMinRate) * 100),
          minFareMinor: Math.round(Number(result.data.minFare) * 100),
        },
      },
      { onSuccess: () => setIsPricingOpen(false) }
    );
  };

  const handleDeleteConfirm = () => {
    if (!selectedVehicleType) return;
    deleteMutation.mutate(selectedVehicleType.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        refreshList();
      },
    });
  };

  const columns = useMemo(
    () =>
      getVehicleTypeColumns({
        pricingMap,
        countrySelected: !!selectedCountryId,
        onEdit: handleOpenEdit,
        onDelete: handleOpenDelete,
        onEditPricing: handleOpenPricing,
      }),
    [pricingMap, selectedCountryId]
  );

  const handlePageChange = (pageIndex: number) => {
    apply({ page: pageIndex + 1 });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading vehicle types…</div>;
  }

  return (
    <div className="space-y-4">
      <VehicleTypeFilters
        controller={{ draft, applied, setDraftValue, apply, reset }}
        isFetching={isFetching}
        countries={countries}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle Type
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={vehicleTypes}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
        />
      </div>

      <VehicleTypeFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={formMode}
        values={formValues}
        setValues={setFormValues}
        errors={formErrors}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
      <DeleteVehicleTypeDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        vehicleType={selectedVehicleType}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
      <PricingFormDialog
        open={isPricingOpen}
        onOpenChange={setIsPricingOpen}
        vehicleType={pricingVehicleType}
        countryName={selectedCountry?.name}
        values={pricingValues}
        setValues={setPricingValues}
        errors={pricingErrors}
        onSubmit={handlePricingSubmit}
        isPending={setPricingMutation.isPending}
      />
    </div>
  );
}