import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CarFront, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getVehicleTypeColumns } from "../components/column";
import { VehicleTypeFilters } from "../components/filters";
import { VehicleTypeFormDialog } from "../components/dialog";
import {
  useVehicleTypes,
  useCreateVehicleType,
  useUpdateVehicleType,
  useSetVehicleTypeActive,
} from "../hooks";
import {
  vehicleTypeCreateSchema,
  vehicleTypeEditSchema,
  type VehicleTypeFormValues,
} from "../schema";
import type { VehicleType, Pagination } from "../types";

const VEHICLE_TYPES_KEY = "vehicle-types";

const EMPTY_FORM: VehicleTypeFormValues = {
  name: "",
  capacity: "",
  sortOrder: "",
  isActive: true,
  baseRate: "",
  perKmRate: "",
  perMinRate: "",
  minFare: "",
};

export default function VehicleTypeList() {
  const queryClient = useQueryClient();
  const { draft, applied, setDraftValue, apply, reset } = useFilterController({ page: 1 });
  const [pageSize, setPageSize] = useState(10);

  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<VehicleTypeFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof VehicleTypeFormValues, string>>
  >({});

  const { page: appliedPageStr, ...vehicleTypeFilterParams } = applied;
  const page = Number(appliedPageStr ?? 1);

  const { data, isLoading, isFetching } = useVehicleTypes({
    ...vehicleTypeFilterParams,
    page,
    limit: pageSize,
  });

  const createMutation = useCreateVehicleType();
  const updateMutation = useUpdateVehicleType();
  const setActiveMutation = useSetVehicleTypeActive();

  const vehicleTypes = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? vehicleTypes.length;

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
      baseRate: (vt.baseRateMinor / 100).toFixed(2),
      perKmRate: (vt.perKmRateMinor / 100).toFixed(2),
      perMinRate: (vt.perMinRateMinor / 100).toFixed(2),
      minFare: (vt.minFareMinor / 100).toFixed(2),
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleToggleActive = (vt: VehicleType) => {
    setActiveMutation.mutate({ id: vt.id, isActive: !vt.isActive });
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
      createMutation.mutate(
        {
          name: result.data.name,
          capacity: result.data.capacity,
          sortOrder: result.data.sortOrder,
          baseRateMinor: Math.round(Number(result.data.baseRate) * 100),
          perKmRateMinor: Math.round(Number(result.data.perKmRate) * 100),
          perMinRateMinor: Math.round(Number(result.data.perMinRate) * 100),
          minFareMinor: Math.round(Number(result.data.minFare) * 100),
        },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            refreshList();
          },
        }
      );
    } else if (selectedVehicleType) {
      const result = vehicleTypeEditSchema.safeParse({
        capacity: formValues.capacity,
        isActive: formValues.isActive,
        baseRate: formValues.baseRate,
        perKmRate: formValues.perKmRate,
        perMinRate: formValues.perMinRate,
        minFare: formValues.minFare,
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
        {
          id: selectedVehicleType.id,
          payload: {
            capacity: result.data.capacity,
            isActive: result.data.isActive,
            baseRateMinor: Math.round(Number(result.data.baseRate) * 100),
            perKmRateMinor: Math.round(Number(result.data.perKmRate) * 100),
            perMinRateMinor: Math.round(Number(result.data.perMinRate) * 100),
            minFareMinor: Math.round(Number(result.data.minFare) * 100),
          },
        },
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
    () => getVehicleTypeColumns({ onEdit: handleOpenEdit, onToggleActive: handleToggleActive }),
    []
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
        <CarFront className="h-5 w-5 text-primary" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
        Vehicle Types
      </h2>

      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
        {totalRecords} Total
      </span>
    </div>

    <Button
      onClick={handleOpenCreate}
      size="sm"
      className="gap-2 h-8"
    >
      <Plus className="h-4 w-4" />
      Add Vehicle Type
    </Button>
  </div>
</div>

      <VehicleTypeFilters
        controller={{ draft, applied, setDraftValue, apply, reset }}
        isFetching={isFetching}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={vehicleTypes}
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
    </div>
  );
}
