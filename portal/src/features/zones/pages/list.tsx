import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Navigation, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getZoneColumns } from "../components/column";
import { ZoneFilters } from "../components/filters";
import {
  ZoneFormDialog,
  ZoneDetectDialog,
  GenerateHexDialog,
} from "../components/dialog";
import {
  useZones,
  useAllZones,
  useCreateZone,
  useUpdateZone,
  useSetZoneActive,
  useCountries,
  useDetectZone,
  useResolveHexZones,
  useGenerateHexCells,
} from "../hooks";
import type { Zone, Pagination, GeoJSONPolygon } from "../types";
import type { ZoneFormState, ZoneDetectFormState, GenerateHexFormState } from "../components/form";

const EMPTY_ZONE_FORM: ZoneFormState = {
  countryId: "",
  name: "",
  type: "",
  multiplier: "1.0",
  polygon: "",
  description: "",
  // Pre-filled (not blank) so hex cells generate in the same click as saving the zone —
  // no separate "Generate Hex Cells" step needed for the normal create/edit flow.
  resolution: "9",
  priority: "1",
};

const EMPTY_DETECT_FORM: ZoneDetectFormState = {
  lat: "",
  lng: "",
};

const EMPTY_GENERATE_HEX_FORM: GenerateHexFormState = {
  resolution: "9",
};

// ZoneFormState.polygon stays a string throughout the form/map (convenient for the advanced
// raw-GeoJSON textarea) — this is the one place it gets converted to the real object the
// backend's jsonb column expects. Sending a string here instead gets double-JSON-encoded by
// the DB driver and comes back unusable (see the "generate hex cells" investigation).
function parseZonePolygon(polygonJson: string): GeoJSONPolygon | null {
  try {
    const parsed = JSON.parse(polygonJson);
    if (parsed?.type === "Polygon" && Array.isArray(parsed.coordinates)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function ZoneList() {
  const controller = useFilterController();
  const [pageSize, setPageSize] = useState(10);

  // Dialog open/close states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetectOpen, setIsDetectOpen] = useState(false);
  const [isGenerateHexOpen, setIsGenerateHexOpen] = useState(false);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [hexZone, setHexZone] = useState<Zone | null>(null);
  const [formValues, setFormValues] = useState<ZoneFormState>(EMPTY_ZONE_FORM);
  const [detectValues, setDetectValues] = useState<ZoneDetectFormState>(EMPTY_DETECT_FORM);
  const [detectedZoneName, setDetectedZoneName] = useState<string | null | undefined>(undefined);
  const [hexMatches, setHexMatches] = useState<Zone[] | undefined>(undefined);
  const [generateHexValues, setGenerateHexValues] = useState<GenerateHexFormState>(EMPTY_GENERATE_HEX_FORM);

  const page = Number(controller.applied.page) || 1;
  const countryId = (controller.applied.countryId as string) || undefined;

  const { data: countriesData } = useCountries();
  const { data: zonesResponse, isLoading, isFetching } = useZones({
    page,
    limit: pageSize,
    countryId,
  });

  // Map context overlays: other zones in the same country while drawing/editing a boundary,
  // and every active zone while picking a point in the Detect dialog (no country selected there).
  const { data: countryZonesData } = useAllZones(formValues.countryId || undefined);
  const { data: allZonesData } = useAllZones();
  const formContextZones = useMemo(
    () => (countryZonesData?.MESSAGE || []).filter((z) => z.id !== selectedZone?.id),
    [countryZonesData, selectedZone],
  );

  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const setActiveMutation = useSetZoneActive();
  const detectMutation = useDetectZone();
  const resolveHexMutation = useResolveHexZones();
  const generateHexMutation = useGenerateHexCells();

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
      polygon: JSON.stringify(zone.polygon),
      description: zone.description || "",
      // Pre-filled with the zone's current resolution (or 9 if never generated) so saving
      // an edit — e.g. after adjusting the polygon on the map — regenerates hex cells to
      // match in the same click, same as create.
      resolution: zone.resolution != null ? String(zone.resolution) : "9",
      priority: String(zone.priority ?? 1),
    });
    setIsEditOpen(true);
  }, []);

  const handleGenerateHexClick = useCallback((zone: Zone) => {
    setHexZone(zone);
    setGenerateHexValues({ resolution: zone.resolution != null ? String(zone.resolution) : "9" });
    setIsGenerateHexOpen(true);
  }, []);

  const handleToggleActive = useCallback((zone: Zone) => {
    setActiveMutation.mutate({ id: zone.id, isActive: !zone.isActive });
  }, [setActiveMutation]);

  const handleCreateSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const polygon = parseZonePolygon(formValues.polygon);
    if (!polygon) {
      toast.error("Draw a zone boundary on the map first");
      return;
    }
    const { resolution, priority, polygon: _polygonText, ...rest } = formValues;
    createMutation.mutate({
      ...rest,
      polygon,
      multiplier: parseFloat(formValues.multiplier) || 1.0,
      priority: priority ? parseInt(priority, 10) : undefined,
      // Omitted entirely (not sent as undefined-but-present) when blank — leaves hex
      // indexing untouched instead of accidentally clearing it.
      ...(resolution ? { resolution: parseInt(resolution, 10) } : {}),
    }, {
      onSuccess: () => setIsCreateOpen(false),
    });
  }, [createMutation, formValues]);

  const handleEditSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;
    const polygon = parseZonePolygon(formValues.polygon);
    if (!polygon) {
      toast.error("Draw a zone boundary on the map first");
      return;
    }
    const { resolution, priority, polygon: _polygonText, ...rest } = formValues;
    updateMutation.mutate({
      id: selectedZone.id,
      payload: {
        ...rest,
        polygon,
        multiplier: parseFloat(formValues.multiplier) || 1.0,
        priority: priority ? parseInt(priority, 10) : undefined,
        ...(resolution ? { resolution: parseInt(resolution, 10) } : {}),
      },
    }, {
      onSuccess: () => setIsEditOpen(false),
    });
  }, [selectedZone, updateMutation, formValues]);

  const handleDetectSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const payload = { lat: parseFloat(detectValues.lat), lng: parseFloat(detectValues.lng) };
    detectMutation.mutate(payload, {
      onSuccess: (res) => setDetectedZoneName(res?.name || null),
    });
    resolveHexMutation.mutate(payload, {
      onSuccess: (res) => setHexMatches(res || []),
    });
  }, [detectMutation, resolveHexMutation, detectValues]);

  const handleGenerateHexSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!hexZone) return;
    generateHexMutation.mutate({
      id: hexZone.id,
      resolution: parseInt(generateHexValues.resolution, 10),
    }, {
      onSuccess: () => setIsGenerateHexOpen(false),
    });
  }, [hexZone, generateHexMutation, generateHexValues]);

  const columns = useMemo(
    () =>
      getZoneColumns({
        countriesMap,
        onEdit: handleEditClick,
        onToggleActive: handleToggleActive,
        onGenerateHex: handleGenerateHexClick,
      }),
    [countriesMap, handleEditClick, handleToggleActive, handleGenerateHexClick]
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
              setHexMatches(undefined);
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
        contextZones={formContextZones}
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
        contextZones={formContextZones}
      />

      <ZoneDetectDialog
        open={isDetectOpen}
        onOpenChange={setIsDetectOpen}
        values={detectValues}
        onChange={setDetectValues}
        onSubmit={handleDetectSubmit}
        isPending={detectMutation.isPending || resolveHexMutation.isPending}
        detectedZoneName={detectedZoneName}
        hexMatches={hexMatches}
        contextZones={allZonesData?.MESSAGE}
      />

      <GenerateHexDialog
        open={isGenerateHexOpen}
        onOpenChange={setIsGenerateHexOpen}
        zone={hexZone}
        values={generateHexValues}
        onChange={setGenerateHexValues}
        onSubmit={handleGenerateHexSubmit}
        isPending={generateHexMutation.isPending}
      />
    </div>
  );
}