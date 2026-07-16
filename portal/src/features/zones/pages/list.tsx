import { useCallback, useMemo, useState } from "react";
import { Plus, Navigation } from "lucide-react";
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
import type { Zone } from "../types";
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

  // Dialog open/close states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetectOpen, setIsDetectOpen] = useState(false);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [formValues, setFormValues] = useState<ZoneFormState>(EMPTY_ZONE_FORM);
  const [detectValues, setDetectValues] = useState<ZoneDetectFormState>(EMPTY_DETECT_FORM);
  const [detectedZoneName, setDetectedZoneName] = useState<string | null | undefined>(undefined);

  // FIX 1: Read page exactly from controller.applied just like DriverList does
  const page = Number(controller.applied.page) || 1;

  // FIX 2: Safely extract filter state directly from controller.applied
  const countryId = (controller.applied.countryId as string) || undefined;

  // React Query Hooks
  const { data: countriesData } = useCountries();
  const { data: zonesResponse, isFetching } = useZones({
    page,
    limit: 10,
    countryId,
  });

  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const deleteMutation = useDeleteZone();
  const detectMutation = useDetectZone();

  const flatZones: Zone[] = zonesResponse?.MESSAGE || [];

  // FIX 3: Fixed the Pagination type constraint error by bypassing strict interface mapping 
  // and directly reading fields as returned from the API shape (Screenshot 2)
  const pagination = zonesResponse?.PAGINATION;
  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.total || flatZones.length; 

  const countriesMap = useMemo(() => {
    const map = new Map<string, string>();
    countriesData?.MESSAGE?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [countriesData]);

  // FIX 4: Update page indices via filter controller actions exactly like DriverList
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
        // FIX 5: Fixes Screenshot 1 error. Mutation resolves directly to the Zone object shape
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <ZoneFilters controller={controller} isFetching={isFetching} />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={() => {
              setDetectValues(EMPTY_DETECT_FORM);
              setDetectedZoneName(undefined);
              setIsDetectOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <Navigation className="h-4 w-4" /> Detect Zone
          </Button>
          <Button
            onClick={handleAddClick}
            className="cursor-pointer gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Zone
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={flatZones}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalItems}
          onPageChange={handlePageChange}
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