import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { getVehicleTypeColumns } from "./column";
import { VehicleTypeFormDialog, DeleteVehicleTypeDialog } from "./dialog";
import {
  useVehicleTypes,
  useCreateVehicleType,
  useUpdateVehicleType,
  useDeleteVehicleType,
} from "./hooks";
import type { VehicleTypeFormValues } from "./schema";
import type { VehicleType } from "./types";

const EMPTY_FORM: VehicleTypeFormValues = {
  name: "",
  slug: "",
  capacity: 1,
  baseRate: "",
  perKmRate: "",
  perMinRate: "",
  minFare: "",
  sortOrder: 0,
  isActive: true,
};

export default function VehicleTypeList() {
  // Dialog / selection state
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<VehicleTypeFormValues>(EMPTY_FORM);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Data + mutations
  const { data, isLoading } = useVehicleTypes();
  const createMutation = useCreateVehicleType();
  const updateMutation = useUpdateVehicleType();
  const deleteMutation = useDeleteVehicleType();

  const vehicleTypes = data?.MESSAGE || [];

  const handleOpenCreate = () => {
    setFormMode("create");
    setFormValues(EMPTY_FORM);
    setSelectedVehicleType(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (vt: VehicleType) => {
    setFormMode("edit");
    setSelectedVehicleType(vt);
    setFormValues({
      name: vt.name,
      slug: vt.slug,
      capacity: vt.capacity,
      baseRate: vt.baseRate,
      perKmRate: vt.perKmRate,
      perMinRate: vt.perMinRate,
      minFare: vt.minFare,
      sortOrder: vt.sortOrder,
      isActive: vt.isActive,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (vt: VehicleType) => {
    setSelectedVehicleType(vt);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name || !formValues.slug || !formValues.baseRate || !formValues.perKmRate) {
      return;
    }

    const payload = {
      name: formValues.name,
      slug: formValues.slug,
      capacity: Number(formValues.capacity),
      baseRate: formValues.baseRate,
      perKmRate: formValues.perKmRate,
      perMinRate: formValues.perMinRate || "0",
      minFare: formValues.minFare || "0",
      sortOrder: Number(formValues.sortOrder ?? 0),
      isActive: formValues.isActive ?? true,
    };

    if (formMode === "create") {
      createMutation.mutate(payload, {
        onSuccess: () => setIsFormOpen(false),
      });
    } else if (selectedVehicleType) {
      updateMutation.mutate(
        { id: selectedVehicleType.id, payload },
        { onSuccess: () => setIsFormOpen(false) }
      );
    }
  };

  const handleDeleteConfirm = () => {
    if (!selectedVehicleType) return;
    deleteMutation.mutate(selectedVehicleType.id, {
      onSuccess: () => setIsDeleteOpen(false),
    });
  };

  const columns = getVehicleTypeColumns({
    onEdit: handleOpenEdit,
    onDelete: handleOpenDelete,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading vehicle types…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle Type
        </Button>
      </div>

      {/* Table — driven by column.tsx definitions */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-foreground">
          <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-4 font-semibold ${col.headerClassName ?? ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vehicleTypes.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  No vehicle configurations found.
                </td>
              </tr>
            ) : (
              vehicleTypes.map((vt) => (
                <tr key={vt.id} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 ${col.cellClassName ?? ""}`}>
                      {col.render(vt)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <VehicleTypeFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={formMode}
        values={formValues}
        setValues={setFormValues}
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