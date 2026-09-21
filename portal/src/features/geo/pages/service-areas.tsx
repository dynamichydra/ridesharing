import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getServiceAreaColumns } from "../components/service-area-column";
import { ServiceAreaDialog } from "../components/service-area-dialog";
import { ServiceAreaHexModal } from "../components/service-area-hex-modal";
import { useServiceAreas, useSetServiceAreaActive, useDeleteServiceArea, useCities } from "../hooks";
import type { CityServiceArea } from "../types";

export default function ServiceAreasTab() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<CityServiceArea | null>(null);
  const [viewingHexArea, setViewingHexArea] = useState<CityServiceArea | null>(null);
  const [isHexModalOpen, setIsHexModalOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 20;
  const cityId = (controller.applied.cityId as string) || undefined;
  const status = (controller.applied.status as string) || undefined;

  const { data: citiesData } = useCities({ limit: 100 });
  const cities = citiesData?.MESSAGE ?? [];

  const { data, isLoading, isFetching } = useServiceAreas({ cityId, status, page, limit });
  const setActiveMutation = useSetServiceAreaActive();
  const deleteMutation = useDeleteServiceArea();

  const filterSchema: FilterSchema = useMemo(
    () => ({
      cityId: {
        label: "City",
        operator: "equals",
        type: "select",
        field: "cityId",
        placeholder: "All Cities",
        options: cities.map((c) => ({ label: c.name, value: c.id })),
      },
      status: {
        label: "Status",
        operator: "equals",
        type: "select",
        field: "status",
        placeholder: "All Statuses",
        options: [
          { label: "Active", value: "ACTIVE" },
          { label: "Inactive", value: "INACTIVE" },
          { label: "Restricted", value: "RESTRICTED" },
        ],
      },
    }),
    [cities],
  );

  const handleAdd = useCallback(() => {
    setEditingArea(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((area: CityServiceArea) => {
    setEditingArea(area);
    setIsDialogOpen(true);
  }, []);

  const handleViewHex = useCallback((area: CityServiceArea) => {
    setViewingHexArea(area);
    setIsHexModalOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (area: CityServiceArea) => {
      setActiveMutation.mutate({ id: area.id, isActive: !area.isActive });
    },
    [setActiveMutation],
  );

  const handleDelete = useCallback(
    (area: CityServiceArea) => {
      if (confirm(`Are you sure you want to delete service area "${area.name}"?`)) {
        deleteMutation.mutate(area.id);
      }
    },
    [deleteMutation],
  );

  const columns = useMemo(
    () =>
      getServiceAreaColumns({
        onViewHex: handleViewHex,
        onEdit: handleEdit,
        onToggleActive: handleToggleActive,
        onDelete: handleDelete,
      }),
    [handleViewHex, handleEdit, handleToggleActive, handleDelete],
  );

  const areas = data?.MESSAGE ?? [];
  const pagination = data?.PAGINATION as any;
  const totalRecords = pagination?.total ?? pagination?.totalItems ?? areas.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">City Service Areas</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} operational service boundaries configured. Validates pickup/dropoff coverage.
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add Service Area
        </Button>
      </div>

      <AutoFilters
        schema={filterSchema}
        controller={controller}
        isFetching={isLoading}
        compact
        className="border-none shadow-none bg-accent/20"
      />

      <DataTable
        columns={columns}
        data={areas}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={page - 1}
        onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <ServiceAreaDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        areaToEdit={editingArea}
        cities={cities}
      />

      <ServiceAreaHexModal
        open={isHexModalOpen}
        onOpenChange={setIsHexModalOpen}
        area={viewingHexArea}
      />
    </div>
  );
}

