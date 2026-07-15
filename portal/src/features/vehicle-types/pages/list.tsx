import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getVehicleTypeColumns } from "../components/column";
import { VehicleTypeFilters } from "../components/filters";
import { VehicleTypeFormDialog, DeleteVehicleTypeDialog } from "../components/dialog";
import {
  useVehicleTypes,
  useCreateVehicleType,
  useUpdateVehicleType,
  useDeleteVehicleType,
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

  const page = Number(applied.page ?? 1);

  const { data, isLoading, isFetching } = useVehicleTypes({
    ...applied,
    page,
    limit: 10,
  });

  const createMutation = useCreateVehicleType();
  const updateMutation = useUpdateVehicleType();
  const deleteMutation = useDeleteVehicleType();

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
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDelete = (vt: VehicleType) => {
    setSelectedVehicleType(vt);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formMode === "create") {
      const result = vehicleTypeCreateSchema.safeParse({
        name: formValues.name,
        capacity: formValues.capacity,
        sortOrder: formValues.sortOrder,
      });
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof VehicleTypeFormValues, string>> = {};
        result.error.issues.forEach((issue) => {
          const key = issue.path[0] as keyof VehicleTypeFormValues;
          fieldErrors[key] = issue.message;
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
          const key = issue.path[0] as keyof VehicleTypeFormValues;
          fieldErrors[key] = issue.message;
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
    () => getVehicleTypeColumns({ onEdit: handleOpenEdit, onDelete: handleOpenDelete }),
    []
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
        controller={{ draft, setDraftValue, apply, reset }}
        isFetching={isFetching}
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
    </div>
  );
}
