import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Plus,
  RefreshCw,
  History,
  MapPin,
  Car,
  TrendingUp,
  Edit,
  Layers,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { pricingPlansApi } from "../api";
import { useCities } from "@/features/geo/hooks";
import { useVehicleTypes } from "@/features/vehicle-types/hooks";
import { useAllZones } from "@/features/zones/hooks";
import toast from "react-hot-toast";

function formatMinor(minor: number | undefined | null, currency = "INR") {
  if (minor === undefined || minor === null) return "₹0.00";
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${(minor / 100).toFixed(2)}`;
}

export default function PricingPlansTab() {
  const controller = useFilterController({ page: 1, limit: 50 });
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lookups
  const { data: citiesData } = useCities({ limit: 500 });
  const { data: vehicleTypesData } = useVehicleTypes({ all: "true" });
  const { data: zonesData } = useAllZones();

  const cities = useMemo(() => (citiesData?.MESSAGE as any[]) || [], [citiesData]);
  const vehicleTypes = useMemo(() => (vehicleTypesData?.MESSAGE as any[]) || [], [vehicleTypesData]);
  const zones = useMemo(() => (zonesData?.MESSAGE as any[]) || [], [zonesData]);

  // Standard AutoFilters Schema
  const filterSchema: FilterSchema = useMemo(
    () => ({
      search: {
        label: "Search",
        operator: "equals",
        type: "text",
        placeholder: "Search name, city...",
      },
      cityId: {
        label: "City",
        operator: "equals",
        type: "select",
        field: "cityId",
        placeholder: "All Cities",
        options: cities.map((c) => ({ label: c.name, value: c.id })),
      },
      vehicleTypeId: {
        label: "Vehicle Type",
        operator: "equals",
        type: "select",
        field: "vehicleTypeId",
        placeholder: "All Vehicle Types",
        options: vehicleTypes.map((vt) => ({ label: vt.name, value: vt.id })),
      },
      isActive: {
        label: "Status",
        operator: "equals",
        type: "select",
        field: "isActive",
        placeholder: "All Statuses",
        options: [
          { label: "Active", value: "true" },
          { label: "Disabled", value: "false" },
        ],
      },
    }),
    [cities, vehicleTypes]
  );

  // Form State for Creating a Plan
  const [planForm, setPlanForm] = useState({
    name: "",
    cityId: "",
    zoneId: "",
    vehicleTypeId: "",
    currencyCode: "INR",
    baseFare: 5000, // ₹50.00
    minimumFare: 7000, // ₹70.00
    distanceRate: 1500, // ₹15.00/km
    timeRate: 200, // ₹2.00/min
    freeWaitingMinutes: 3,
    waitingRate: 200, // ₹2.00/min
    bookingFee: 1000, // ₹10.00
    platformFee: 500, // ₹5.00
    cancellationFee: 3000, // ₹30.00
  });

  // Form State for Comprehensive Edit of Plan & Rates
  const [editForm, setEditForm] = useState({
    planId: "",
    versionId: "",
    versionNumber: 1,
    name: "",
    cityId: "",
    zoneId: "",
    vehicleTypeId: "",
    scope: "city",
    currencyCode: "INR",
    isActive: true,
    // Rate card fields
    baseFare: 5000,
    minimumFare: 7000,
    distanceRate: 1500,
    timeRate: 200,
    freeWaitingMinutes: 3,
    waitingRate: 200,
    bookingFee: 1000,
    platformFee: 500,
    cancellationFee: 3000,
    saveMode: "update_version" as "update_version" | "new_version",
  });

  // Form State for Creating a Version
  const [versionForm, setVersionForm] = useState({
    baseFare: 5000,
    minimumFare: 7000,
    distanceRate: 1500,
    timeRate: 200,
    freeWaitingMinutes: 3,
    waitingRate: 200,
    bookingFee: 1000,
    platformFee: 500,
    cancellationFee: 3000,
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { cityId, vehicleTypeId, isActive } = controller.applied;
      const res = await pricingPlansApi.list({
        limit: 100,
        cityId: cityId || undefined,
        vehicleTypeId: vehicleTypeId || undefined,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      });
      setPlans(res?.MESSAGE || []);
    } catch {
      toast.error("Failed to load pricing plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [controller.applied]);

  // Filtered plans based on client search text
  const filteredPlans = useMemo(() => {
    const search = controller.applied.search?.trim().toLowerCase();
    if (!search) return plans;
    return plans.filter((row: any) => {
      const planName = row.plan?.name?.toLowerCase() || "";
      const cityName = row.city?.name?.toLowerCase() || "";
      const zoneName = row.zone?.name?.toLowerCase() || "";
      const vehicleName = row.vehicleType?.name?.toLowerCase() || "";
      return (
        planName.includes(search) ||
        cityName.includes(search) ||
        zoneName.includes(search) ||
        vehicleName.includes(search)
      );
    });
  }, [plans, controller.applied.search]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name || !planForm.cityId || !planForm.vehicleTypeId) {
      toast.error("Please fill in Plan Name, City, and Vehicle Type");
      return;
    }
    setSubmitting(true);
    try {
      await pricingPlansApi.create({
        name: planForm.name,
        cityId: planForm.cityId,
        zoneId: planForm.zoneId || null,
        vehicleTypeId: planForm.vehicleTypeId,
        scope: planForm.zoneId ? "zone" : "city",
        currencyCode: planForm.currencyCode,
        isActive: true,
        initialVersion: {
          baseFare: Number(planForm.baseFare),
          minimumFare: Number(planForm.minimumFare),
          distanceRate: Number(planForm.distanceRate),
          timeRate: Number(planForm.timeRate),
          freeWaitingMinutes: Number(planForm.freeWaitingMinutes),
          waitingRate: Number(planForm.waitingRate),
          bookingFee: Number(planForm.bookingFee),
          platformFee: Number(planForm.platformFee),
          cancellationFee: Number(planForm.cancellationFee),
        },
      });
      toast.success("Pricing plan created successfully with Version 1");
      setCreatePlanOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create pricing plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (planRow: any) => {
    setSelectedPlan(planRow);
    const plan = planRow.plan;
    const active = planRow.activeVersion;
    setEditForm({
      planId: plan.id,
      versionId: active?.id || "",
      versionNumber: active?.version || 1,
      name: plan.name || "",
      cityId: plan.cityId || "",
      zoneId: plan.zoneId || "",
      vehicleTypeId: plan.vehicleTypeId || "",
      scope: plan.scope || (plan.zoneId ? "zone" : "city"),
      currencyCode: plan.currencyCode || "INR",
      isActive: plan.isActive,
      baseFare: active?.baseFare ?? 5000,
      minimumFare: active?.minimumFare ?? 7000,
      distanceRate: active?.distanceRate ?? 1500,
      timeRate: active?.timeRate ?? 200,
      freeWaitingMinutes: active?.freeWaitingMinutes ?? 3,
      waitingRate: active?.waitingRate ?? 200,
      bookingFee: active?.bookingFee ?? 1000,
      platformFee: active?.platformFee ?? 500,
      cancellationFee: active?.cancellationFee ?? 3000,
      saveMode: "update_version",
    });
    setEditPlanOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.cityId || !editForm.vehicleTypeId) {
      toast.error("Please fill in Plan Name, City, and Vehicle Type");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Update master plan properties
      await pricingPlansApi.update(editForm.planId, {
        name: editForm.name,
        cityId: editForm.cityId,
        zoneId: editForm.zoneId || null,
        vehicleTypeId: editForm.vehicleTypeId,
        scope: editForm.zoneId ? "zone" : "city",
        currencyCode: editForm.currencyCode,
        isActive: editForm.isActive,
      });

      const ratePayload = {
        baseFare: Number(editForm.baseFare),
        minimumFare: Number(editForm.minimumFare),
        distanceRate: Number(editForm.distanceRate),
        timeRate: Number(editForm.timeRate),
        freeWaitingMinutes: Number(editForm.freeWaitingMinutes),
        waitingRate: Number(editForm.waitingRate),
        bookingFee: Number(editForm.bookingFee),
        platformFee: Number(editForm.platformFee),
        cancellationFee: Number(editForm.cancellationFee),
      };

      // 2. Either update current version or create a new version
      if (editForm.saveMode === "new_version" || !editForm.versionId) {
        await pricingPlansApi.createVersion(editForm.planId, {
          ...ratePayload,
          effectiveFrom: new Date().toISOString(),
          isActive: true,
        });
        toast.success("Plan updated and new version published!");
      } else {
        await pricingPlansApi.updateVersion(editForm.planId, editForm.versionId, ratePayload);
        toast.success("Pricing plan and rate card updated successfully!");
      }

      setEditPlanOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to update pricing plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNewVersion = (planRow: any) => {
    setSelectedPlan(planRow);
    const active = planRow.activeVersion;
    if (active) {
      setVersionForm({
        baseFare: active.baseFare,
        minimumFare: active.minimumFare,
        distanceRate: active.distanceRate,
        timeRate: active.timeRate,
        freeWaitingMinutes: active.freeWaitingMinutes ?? 3,
        waitingRate: active.waitingRate ?? 200,
        bookingFee: active.bookingFee ?? 1000,
        platformFee: active.platformFee ?? 500,
        cancellationFee: active.cancellationFee ?? 3000,
      });
    }
    setNewVersionOpen(true);
  };

  const handleCreateNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await pricingPlansApi.createVersion(selectedPlan.plan.id, {
        baseFare: Number(versionForm.baseFare),
        minimumFare: Number(versionForm.minimumFare),
        distanceRate: Number(versionForm.distanceRate),
        timeRate: Number(versionForm.timeRate),
        freeWaitingMinutes: Number(versionForm.freeWaitingMinutes),
        waitingRate: Number(versionForm.waitingRate),
        bookingFee: Number(versionForm.bookingFee),
        platformFee: Number(versionForm.platformFee),
        cancellationFee: Number(versionForm.cancellationFee),
        effectiveFrom: new Date().toISOString(),
        isActive: true,
      });
      toast.success("New pricing plan version published successfully");
      setNewVersionOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create new version");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePlan = async (plan: any) => {
    try {
      await pricingPlansApi.update(plan.id, { isActive: !plan.isActive });
      toast.success(`Plan ${plan.isActive ? "disabled" : "enabled"}`);
      fetchPlans();
    } catch {
      toast.error("Failed to update plan status");
    }
  };

  const handleOpenHistory = async (planRow: any) => {
    setSelectedPlan(planRow);
    setHistoryOpen(true);
    try {
      const res = await pricingPlansApi.getById(planRow.plan.id);
      if (res?.MESSAGE) {
        setSelectedPlan((prev: any) => ({ ...prev, ...res.MESSAGE }));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                Pricing Plans & Rate Cards
              </h3>
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 font-mono">
                {plans.length} Plans Total
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure base fares, per-km/min rates, waiting fees, and version-controlled rate cards by City, Zone & Vehicle Type.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchPlans}
            className="gap-2 h-9 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreatePlanOpen(true)}
            className="gap-2 h-9 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Pricing Plan
          </Button>
        </div>
      </div>

      {/* ── Standard AutoFilters (Consistent with other portal pages) ─────── */}
      <AutoFilters
        schema={filterSchema}
        controller={controller}
        isFetching={loading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      {/* ── Plans Data Table ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-muted-foreground text-sm bg-card rounded-xl border border-border">
          <RefreshCw className="h-5 w-5 animate-spin mr-2 text-primary" />
          Loading pricing plans...
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3 bg-card/50">
          <DollarSign className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
          <h4 className="font-semibold text-base">No pricing plans found</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {controller.applied.search || controller.applied.cityId || controller.applied.vehicleTypeId || controller.applied.isActive
              ? "No plans match the current filters. Try changing or resetting your search criteria."
              : "Configure city-wide or zone-specific rate cards with base fare, distance rates, and version history."}
          </p>
          <Button size="sm" onClick={() => setCreatePlanOpen(true)} className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Create First Plan
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[240px] font-bold text-xs uppercase tracking-wider">Plan & Scope</TableHead>
                <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider">Vehicle Type</TableHead>
                <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider">Base & Min</TableHead>
                <TableHead className="w-[150px] font-bold text-xs uppercase tracking-wider">Rates (KM / Min)</TableHead>
                <TableHead className="w-[150px] font-bold text-xs uppercase tracking-wider">Waiting Rules</TableHead>
                <TableHead className="w-[160px] font-bold text-xs uppercase tracking-wider">Fees</TableHead>
                <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider">Version</TableHead>
                <TableHead className="w-[110px] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-[180px] text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((row: any) => {
                const plan = row.plan;
                const city = row.city;
                const zone = row.zone;
                const vehicleType = row.vehicleType;
                const activeVersion = row.activeVersion;
                const versionsCount = row.versionCount || 1;
                const isZoneScope = plan.scope === "zone" || !!zone;

                return (
                  <TableRow key={plan.id} className="hover:bg-muted/30 transition-colors">
                    {/* Plan & Scope */}
                    <TableCell className="align-middle">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          {plan.name}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] py-0 px-1.5 font-medium ${
                              isZoneScope
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            }`}
                          >
                            <MapPin className="h-2.5 w-2.5 mr-0.5 inline" />
                            {isZoneScope ? `Zone: ${zone?.name || "Specific"}` : `City: ${city?.name || "City-wide"}`}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono text-muted-foreground">
                            {plan.currencyCode || "INR"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    {/* Vehicle Type */}
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded bg-muted text-foreground">
                          <Car className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-xs text-foreground">
                          {vehicleType?.name || "All Vehicles"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Base & Min */}
                    <TableCell className="align-middle">
                      <div className="text-xs space-y-0.5">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase mr-1">Base:</span>
                          <span className="font-bold text-foreground">
                            {formatMinor(activeVersion?.baseFare, plan.currencyCode)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase mr-1">Min:</span>
                          <span className="font-semibold text-foreground">
                            {formatMinor(activeVersion?.minimumFare, plan.currencyCode)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Rates (Distance / Time) */}
                    <TableCell className="align-middle">
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold text-foreground">
                          {formatMinor(activeVersion?.distanceRate, plan.currencyCode)} <span className="text-[10px] text-muted-foreground">/km</span>
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {formatMinor(activeVersion?.timeRate, plan.currencyCode)} <span className="text-[10px]">/min</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Waiting Rules */}
                    <TableCell className="align-middle">
                      <div className="text-xs space-y-0.5">
                        <div className="font-medium text-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatMinor(activeVersion?.waitingRate, plan.currencyCode)}/min
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Grace: {activeVersion?.freeWaitingMinutes ?? 0} mins free
                        </div>
                      </div>
                    </TableCell>

                    {/* Ancillary Fees */}
                    <TableCell className="align-middle">
                      <div className="text-[11px] space-y-0.5 text-muted-foreground">
                        <div>
                          Booking: <span className="font-medium text-foreground">{formatMinor(activeVersion?.bookingFee, plan.currencyCode)}</span>
                        </div>
                        <div>
                          Cancel: <span className="font-medium text-foreground">{formatMinor(activeVersion?.cancellationFee, plan.currencyCode)}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Version */}
                    <TableCell className="align-middle">
                      <button
                        onClick={() => handleOpenHistory(row)}
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium text-primary hover:underline bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded border border-primary/20 cursor-pointer"
                        title="View version history"
                      >
                        <History className="h-3 w-3" />
                        v{activeVersion?.version || 1}
                        <span className="text-[10px] text-muted-foreground font-sans">({versionsCount})</span>
                      </button>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plan.isActive}
                          onCheckedChange={() => handleTogglePlan(plan)}
                          aria-label="Toggle plan status"
                        />
                        <span className={`text-[11px] font-semibold ${plan.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                          {plan.isActive ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(row)}
                          className="h-8 px-2 text-xs gap-1 font-medium cursor-pointer hover:border-primary hover:text-primary"
                          title="Edit everything (Plan details & rate values)"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit Plan
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenNewVersion(row)}
                          className="h-8 px-2 text-xs gap-1 font-medium cursor-pointer text-muted-foreground hover:text-foreground"
                          title="Create next version"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          +v{(activeVersion?.version || 1) + 1}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Dialog: Comprehensive Edit Everything (Plan + Rates) ──────────── */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit className="h-5 w-5 text-primary" />
              Edit Pricing Plan & Rate Card: {editForm.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify plan scope, vehicle configuration, and active rate card figures.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-5 py-2">
            {/* Section 1: Plan Metadata */}
            <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Layers className="h-4 w-4" />
                1. Plan Scope & Identity
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editPlanName">Plan Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="editPlanName"
                    placeholder="e.g. Kolkata Sedan Standard Rates"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editCurrencyCode">Currency</Label>
                  <Input
                    id="editCurrencyCode"
                    value={editForm.currencyCode}
                    onChange={(e) => setEditForm({ ...editForm, currencyCode: e.target.value.toUpperCase() })}
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editCityId">City <span className="text-red-500">*</span></Label>
                  <NativeSelect
                    id="editCityId"
                    value={editForm.cityId}
                    onChange={(e) => setEditForm({ ...editForm, cityId: e.target.value })}
                    required
                  >
                    <NativeSelectOption value="">Select City</NativeSelectOption>
                    {cities.map((c) => (
                      <NativeSelectOption key={c.id} value={c.id}>
                        {c.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editZoneId">Zone (Optional)</Label>
                  <NativeSelect
                    id="editZoneId"
                    value={editForm.zoneId}
                    onChange={(e) => setEditForm({ ...editForm, zoneId: e.target.value })}
                  >
                    <NativeSelectOption value="">City-wide (All Zones)</NativeSelectOption>
                    {zones.map((z) => (
                      <NativeSelectOption key={z.id} value={z.id}>
                        {z.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editVehicleTypeId">Vehicle Type <span className="text-red-500">*</span></Label>
                  <NativeSelect
                    id="editVehicleTypeId"
                    value={editForm.vehicleTypeId}
                    onChange={(e) => setEditForm({ ...editForm, vehicleTypeId: e.target.value })}
                    required
                  >
                    <NativeSelectOption value="">Select Vehicle Type</NativeSelectOption>
                    {vehicleTypes.map((vt) => (
                      <NativeSelectOption key={vt.id} value={vt.id}>
                        {vt.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.isActive}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                    id="editPlanActive"
                  />
                  <Label htmlFor="editPlanActive" className="text-xs font-semibold cursor-pointer">
                    Plan Enabled for Matching & Fare Quotes
                  </Label>
                </div>
              </div>
            </div>

            {/* Section 2: Rate Card Breakdown */}
            <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <DollarSign className="h-4 w-4" />
                  2. Rate Card Parameters (in Paise / Minor Units)
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Active Version: v{editForm.versionNumber}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Base Fare (Minor)</Label>
                  <Input
                    type="number"
                    value={editForm.baseFare}
                    onChange={(e) => setEditForm({ ...editForm, baseFare: Number(e.target.value) })}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.baseFare, editForm.currencyCode)}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Min Fare (Minor)</Label>
                  <Input
                    type="number"
                    value={editForm.minimumFare}
                    onChange={(e) => setEditForm({ ...editForm, minimumFare: Number(e.target.value) })}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.minimumFare, editForm.currencyCode)}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Per KM Rate (Minor)</Label>
                  <Input
                    type="number"
                    value={editForm.distanceRate}
                    onChange={(e) => setEditForm({ ...editForm, distanceRate: Number(e.target.value) })}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.distanceRate, editForm.currencyCode)}/km
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Per Min Rate (Minor)</Label>
                  <Input
                    type="number"
                    value={editForm.timeRate}
                    onChange={(e) => setEditForm({ ...editForm, timeRate: Number(e.target.value) })}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.timeRate, editForm.currencyCode)}/min
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Free Wait (mins)</Label>
                  <Input
                    type="number"
                    value={editForm.freeWaitingMinutes}
                    onChange={(e) => setEditForm({ ...editForm, freeWaitingMinutes: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Wait ₹/min (Minor)</Label>
                  <Input
                    type="number"
                    value={editForm.waitingRate}
                    onChange={(e) => setEditForm({ ...editForm, waitingRate: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.waitingRate, editForm.currencyCode)}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Booking Fee</Label>
                  <Input
                    type="number"
                    value={editForm.bookingFee}
                    onChange={(e) => setEditForm({ ...editForm, bookingFee: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.bookingFee, editForm.currencyCode)}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Platform Fee</Label>
                  <Input
                    type="number"
                    value={editForm.platformFee}
                    onChange={(e) => setEditForm({ ...editForm, platformFee: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.platformFee, editForm.currencyCode)}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Cancel Fee</Label>
                  <Input
                    type="number"
                    value={editForm.cancellationFee}
                    onChange={(e) => setEditForm({ ...editForm, cancellationFee: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    = {formatMinor(editForm.cancellationFee, editForm.currencyCode)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Save Strategy */}
            <div className="p-3 bg-accent/30 rounded-xl border border-border space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                3. Deployment Strategy
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  editForm.saveMode === "update_version"
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-card border-border hover:bg-muted/40"
                }`}>
                  <input
                    type="radio"
                    name="saveMode"
                    value="update_version"
                    checked={editForm.saveMode === "update_version"}
                    onChange={() => setEditForm({ ...editForm, saveMode: "update_version" })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block">Update Active Version (v{editForm.versionNumber})</span>
                    <span className="text-[11px] text-muted-foreground">
                      Directly modifies current version values without bumping version number.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  editForm.saveMode === "new_version"
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-card border-border hover:bg-muted/40"
                }`}>
                  <input
                    type="radio"
                    name="saveMode"
                    value="new_version"
                    checked={editForm.saveMode === "new_version"}
                    onChange={() => setEditForm({ ...editForm, saveMode: "new_version" })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block">Deploy as New Version (v{editForm.versionNumber + 1})</span>
                    <span className="text-[11px] text-muted-foreground">
                      Preserves historical rate cards and creates an immutable new active version.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditPlanOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create Pricing Plan ───────────────────────────────────── */}
      <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Create Master Pricing Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set up a rate card scoped to a city or specific zone with initial Version 1 rates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="planName">Plan Name <span className="text-red-500">*</span></Label>
              <Input
                id="planName"
                placeholder="e.g. Kolkata Sedan Standard Rates"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cityId">City <span className="text-red-500">*</span></Label>
                <NativeSelect
                  id="cityId"
                  value={planForm.cityId}
                  onChange={(e) => setPlanForm({ ...planForm, cityId: e.target.value })}
                  required
                >
                  <NativeSelectOption value="">Select City</NativeSelectOption>
                  {cities.map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="zoneId">Zone (Optional / Specific)</Label>
                <NativeSelect
                  id="zoneId"
                  value={planForm.zoneId}
                  onChange={(e) => setPlanForm({ ...planForm, zoneId: e.target.value })}
                >
                  <NativeSelectOption value="">City-wide (All Zones)</NativeSelectOption>
                  {zones.map((z) => (
                    <NativeSelectOption key={z.id} value={z.id}>
                      {z.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vehicleTypeId">Vehicle Type <span className="text-red-500">*</span></Label>
                <NativeSelect
                  id="vehicleTypeId"
                  value={planForm.vehicleTypeId}
                  onChange={(e) => setPlanForm({ ...planForm, vehicleTypeId: e.target.value })}
                  required
                >
                  <NativeSelectOption value="">Select Vehicle Type</NativeSelectOption>
                  {vehicleTypes.map((vt) => (
                    <NativeSelectOption key={vt.id} value={vt.id}>
                      {vt.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currencyCode">Currency</Label>
                <Input
                  id="currencyCode"
                  value={planForm.currencyCode}
                  onChange={(e) => setPlanForm({ ...planForm, currencyCode: e.target.value.toUpperCase() })}
                  placeholder="INR"
                />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Initial Version (v1) Rate Parameters (in Paise / Minor Units)
              </h5>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Base Fare (e.g. 5000 = ₹50.00)</Label>
                  <Input
                    type="number"
                    value={planForm.baseFare}
                    onChange={(e) => setPlanForm({ ...planForm, baseFare: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min Fare (e.g. 7000 = ₹70.00)</Label>
                  <Input
                    type="number"
                    value={planForm.minimumFare}
                    onChange={(e) => setPlanForm({ ...planForm, minimumFare: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Per KM Rate (e.g. 1500 = ₹15.00/km)</Label>
                  <Input
                    type="number"
                    value={planForm.distanceRate}
                    onChange={(e) => setPlanForm({ ...planForm, distanceRate: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Per Min Rate (e.g. 200 = ₹2.00/min)</Label>
                  <Input
                    type="number"
                    value={planForm.timeRate}
                    onChange={(e) => setPlanForm({ ...planForm, timeRate: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Free Waiting (min)</Label>
                  <Input
                    type="number"
                    value={planForm.freeWaitingMinutes}
                    onChange={(e) => setPlanForm({ ...planForm, freeWaitingMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Waiting ₹/min</Label>
                  <Input
                    type="number"
                    value={planForm.waitingRate}
                    onChange={(e) => setPlanForm({ ...planForm, waitingRate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Booking Fee</Label>
                  <Input
                    type="number"
                    value={planForm.bookingFee}
                    onChange={(e) => setPlanForm({ ...planForm, bookingFee: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setCreatePlanOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Deploying..." : "Create Plan & Deploy v1"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create New Version for Plan ────────────────────────────── */}
      <Dialog open={newVersionOpen} onOpenChange={setNewVersionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Publish New Version for {selectedPlan?.plan?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will create a new sequential version (e.g. v{(selectedPlan?.activeVersion?.version || 1) + 1}) and make it immediately active for fare calculation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewVersion} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Base Fare (minor units)</Label>
                <Input
                  type="number"
                  value={versionForm.baseFare}
                  onChange={(e) => setVersionForm({ ...versionForm, baseFare: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Minimum Fare (minor units)</Label>
                <Input
                  type="number"
                  value={versionForm.minimumFare}
                  onChange={(e) => setVersionForm({ ...versionForm, minimumFare: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Distance Rate (₹/km minor)</Label>
                <Input
                  type="number"
                  value={versionForm.distanceRate}
                  onChange={(e) => setVersionForm({ ...versionForm, distanceRate: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Time Rate (₹/min minor)</Label>
                <Input
                  type="number"
                  value={versionForm.timeRate}
                  onChange={(e) => setVersionForm({ ...versionForm, timeRate: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Free Wait (min)</Label>
                <Input
                  type="number"
                  value={versionForm.freeWaitingMinutes}
                  onChange={(e) => setVersionForm({ ...versionForm, freeWaitingMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Waiting ₹/min</Label>
                <Input
                  type="number"
                  value={versionForm.waitingRate}
                  onChange={(e) => setVersionForm({ ...versionForm, waitingRate: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Booking Fee</Label>
                <Input
                  type="number"
                  value={versionForm.bookingFee}
                  onChange={(e) => setVersionForm({ ...versionForm, bookingFee: Number(e.target.value) })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setNewVersionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Publishing..." : "Publish Version"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Version History & Details ──────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Version History — {selectedPlan?.plan?.name || selectedPlan?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit log of all versions deployed for this pricing rate card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {(selectedPlan?.versions || [selectedPlan?.activeVersion]).filter(Boolean).map((ver: any) => (
              <div
                key={ver.id || ver.version}
                className={`border rounded-lg p-3 space-y-2 ${
                  ver.isActive ? "bg-accent/30 border-primary/30" : "bg-card border-border opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="font-mono text-xs">
                      Version v{ver.version}
                    </Badge>
                    {ver.isActive && (
                      <span className="text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded font-semibold">
                        Active Rate Card
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Effective: {ver.effectiveFrom ? new Date(ver.effectiveFrom).toLocaleDateString() : "Immediate"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Base Fare</span>
                    <p className="font-semibold">{formatMinor(ver.baseFare, selectedPlan?.plan?.currencyCode || selectedPlan?.currencyCode)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Min Fare</span>
                    <p className="font-semibold">{formatMinor(ver.minimumFare, selectedPlan?.plan?.currencyCode || selectedPlan?.currencyCode)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Distance Rate</span>
                    <p className="font-semibold">{formatMinor(ver.distanceRate, selectedPlan?.plan?.currencyCode || selectedPlan?.currencyCode)}/km</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Time Rate</span>
                    <p className="font-semibold">{formatMinor(ver.timeRate, selectedPlan?.plan?.currencyCode || selectedPlan?.currencyCode)}/min</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
