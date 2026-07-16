import { useCallback, useMemo, useState } from "react";
import { Plus, Navigation, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getZoneColumns } from "../components/column";
import { ZoneFilters } from "../components/filters";
import {
  ZoneFormDialog,
  ZoneDetectDialog,
  DeleteZoneDialog,
} from "../components/dialog";
import {
  useZones,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
  useCountries,
  useDetectZone,
} from "../hooks";
import type { Zone, Pagination } from "../types";
import type { ZoneFormState, ZoneDetectFormState } from "../components/form";

const EMPTY_ZONE_FORM: ZoneFormState = {
  countryId: "",
  name: "",
  type: "",
  multiplier: "1.0",
  polygon: "",
  description: "",
};

const EMPTY_DETECT_FORM: ZoneDetectFormState = {
  lat: "",
  lng: "",
};

export default function ZoneList() {
  const controller = useFilterController();
  const [pageSize, setPageSize] = useState(10);

  // Dialog open/close states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetectOpen, setIsDetectOpen] = useState(false);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [formValues, setFormValues] = useState<ZoneFormState>(EMPTY_ZONE_FORM);
  const [detectValues, setDetectValues] = useState<ZoneDetectFormState>(EMPTY_DETECT_FORM);
  const [detectedZoneName, setDetectedZoneName] = useState<string | null | undefined>(undefined);

  const page = Number(controller.applied.page) || 1;
  const countryId = (controller.applied.countryId as string) || undefined;

  const { data: countriesData } = useCountries();
  const { data: zonesResponse, isLoading, isFetching } = useZones({
    page,
    limit: pageSize,
    countryId,
  });

  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const deleteMutation = useDeleteZone();
  const detectMutation = useDetectZone();

  const flatZones: Zone[] = zonesResponse?.MESSAGE || [];

  const pagination = zonesResponse?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.totalItems ?? flatZones.length;

  const countriesMap = useMemo(() => {
    const map = new Map<string, string>();
    countriesData?.MESSAGE?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [countriesData]);

  const handlePageChange = useCallback((zeroBasedIndex: number) => {
    controller.apply({ page: zeroBasedIndex + 1 });
  }, [controller]);

  const handleAddClick = useCallback(() => {
    setFormValues(EMPTY_ZONE_FORM);
    setIsCreateOpen(true);
  }, []);

  const handleEditClick = useCallback((zone: Zone) => {
    setSelectedZone(zone);
    setFormValues({
      countryId: zone.countryId,
      name: zone.name,
      type: zone.type,
      multiplier: String(zone.multiplier),
      polygon: zone.polygon,
      description: zone.description || "",
    });
    setIsEditOpen(true);
  }, []);

  const handleDeleteClick = useCallback((zone: Zone) => {
    setSelectedZone(zone);
    setIsDeleteOpen(true);
  }, []);

  const handleCreateSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formValues,
      multiplier: parseFloat(formValues.multiplier) || 1.0,
    }, {
      onSuccess: () => setIsCreateOpen(false),
    });
  }, [createMutation, formValues]);

  const handleEditSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;
    updateMutation.mutate({
      id: selectedZone.id,
      payload: {
        ...formValues,
        multiplier: parseFloat(formValues.multiplier) || 1.0,
      },
    }, {
      onSuccess: () => setIsEditOpen(false),
    });
  }, [selectedZone, updateMutation, formValues]);

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedZone) return;
    deleteMutation.mutate(selectedZone.id, {
      onSuccess: () => setIsDeleteOpen(false),
    });
  }, [selectedZone, deleteMutation]);

  const handleDetectSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    detectMutation.mutate({
      lat: parseFloat(detectValues.lat),
      lng: parseFloat(detectValues.lng),
    }, {
      onSuccess: (res) => {
        setDetectedZoneName(res?.name || null);
      },
    });
  }, [detectMutation, detectValues]);

  const columns = useMemo(
    () =>
      getZoneColumns({
        countriesMap,
        onEdit: handleEditClick,
        onDelete: handleDeleteClick,
      }),
    [countriesMap, handleEditClick, handleDeleteClick]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <MapIcon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Zones
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalItems} Total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDetectValues(EMPTY_DETECT_FORM);
              setDetectedZoneName(undefined);
              setIsDetectOpen(true);
            }}
            className="gap-2 h-8"
          >
            <Navigation className="h-4 w-4" /> Detect Zone
          </Button>
          <Button
            onClick={handleAddClick}
            size="sm"
            className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8"
          >
            <Plus className="h-4 w-4" /> Add Zone
          </Button>
        </div>
      </div>

      <ZoneFilters controller={controller} isFetching={isLoading} />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={flatZones}
          pageIndex={page - 1}
          pageSize={pageSize}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => {
            setPageSize(size);
            controller.apply({ page: 1 });
          }}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <ZoneFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        zone={null}
        countries={countriesData?.MESSAGE || []}
        values={formValues}
        onChange={setFormValues}
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
      />

      <ZoneFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        zone={selectedZone}
        countries={countriesData?.MESSAGE || []}
        values={formValues}
        onChange={setFormValues}
        onSubmit={handleEditSubmit}
        isPending={updateMutation.isPending}
      />

      <ZoneDetectDialog
        open={isDetectOpen}
        onOpenChange={setIsDetectOpen}
        values={detectValues}
        onChange={setDetectValues}
        onSubmit={handleDetectSubmit}
        isPending={detectMutation.isPending}
        detectedZoneName={detectedZoneName}
      />

      <DeleteZoneDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        zone={selectedZone}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}