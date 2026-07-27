import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Plus, Tag } from "lucide-react";
import { getVehicleModelColumns } from "../components/column";
import { VehicleModelFormDialog } from "../components/dialog";
import { useVehicleModels, useSetVehicleModelActive, useVehicleTypeOptions } from "../hooks";
import type { VehicleModel } from "../types";

export default function VehicleModelList() {
  const queryClient = useQueryClient();
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleModel | null>(null);

  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const vehicleTypes = vehicleTypesData?.MESSAGE ?? [];
  const vehicleTypeNameById = useMemo(
    () => Object.fromEntries(vehicleTypes.map((vt) => [vt.id, vt.name])),
    [vehicleTypes],
  );

  const FILTER_SCHEMA: FilterSchema = {
    vehicleTypeId: {
      label: "Vehicle Type",
      operator: "equals",
      type: "select",
      field: "vehicleTypeId",
      placeholder: "All Vehicle Types",
      options: vehicleTypes.map((vt) => ({ label: vt.name, value: vt.id })),
    },
  };

  const { data, isLoading, isFetching } = useVehicleModels({
    vehicleTypeId: controller.applied.vehicleTypeId,
    limit: Number(controller.applied.limit) || 10,
    page: Number(controller.applied.page) || 1,
  });
  const setActiveMutation = useSetVehicleModelActive();

  const vehicleModels = data?.MESSAGE ?? [];

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["vehicle-models"], refetchType: "active" });
  }, [queryClient]);

  const handleOpenCreate = () => {
    setEditing(null);
    setIsDialogOpen(true);
  };

  const handleEdit = useCallback((vm: VehicleModel) => {
    setEditing(vm);
    setIsDialogOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (vm: VehicleModel) => {
      setActiveMutation.mutate({ id: vm.id, isActive: !vm.isActive }, { onSuccess: refreshList });
    },
    [setActiveMutation, refreshList],
  );

  const columns = useMemo(
    () => getVehicleModelColumns({ vehicleTypeNameById, onEdit: handleEdit, onToggleActive: handleToggleActive }),
    [vehicleTypeNameById, handleEdit, handleToggleActive],
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="w-full flex-col p-3 md:p-6 flex gap-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">Vehicle Models</h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {data?.COUNT ?? 0} Total
          </span>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8"
        >
          <Plus className="h-4 w-4" /> Add Vehicle Model
        </Button>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <DataTable
        columns={columns}
        data={vehicleModels}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={(Number(controller.applied.page) || 1) - 1}
        pageSize={Number(controller.applied.limit) || 10}
        onPageChange={handlePageChange}
        onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <VehicleModelFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        vehicleModel={editing}
        onSuccess={refreshList}
      />
    </div>
  );
}
