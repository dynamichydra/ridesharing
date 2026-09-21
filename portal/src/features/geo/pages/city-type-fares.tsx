import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  ArrowLeft,
  Car,
  Percent,
  CheckCircle2,
  Clock,
  ShieldCheck,
  History,
  PlusCircle,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useCityTypes, useCityTypeFares, useCreateCityTypeFareVersion, useActivateCityTypeFare, useDeleteCityTypeFare } from "../hooks";
import { useVehicleTypes } from "@/features/vehicle-types/hooks";
import { cityTypeFareSchema, emptyCityTypeFareFormValues, type CityTypeFareFormValues } from "../schema";
import type { CityTypeFare } from "../types";

export default function CityTypeFaresPage() {
  const { cityTypeId } = useParams<{ cityTypeId: string }>();
  const navigate = useNavigate();

  const { data: cityTypesData, isLoading: isCityTypesLoading } = useCityTypes({ limit: 100 });
  const cityType = (cityTypesData?.MESSAGE ?? []).find((ct) => ct.id === cityTypeId);

  const { data: faresData, isLoading: isFaresLoading } = useCityTypeFares(cityTypeId || null);
  const fares = (faresData?.MESSAGE ?? []) as CityTypeFare[];

  const { data: vehicleTypesData } = useVehicleTypes({ limit: 50 });
  const vehicleTypes = (vehicleTypesData?.MESSAGE ?? []) as any[];

  const createVersionMutation = useCreateCityTypeFareVersion();
  const activateMutation = useActivateCityTypeFare();
  const deleteMutation = useDeleteCityTypeFare();

  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>("ALL");

  const form = useForm<CityTypeFareFormValues>({
    resolver: zodResolver(cityTypeFareSchema),
    defaultValues: emptyCityTypeFareFormValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    if (!cityTypeId || !values.vehicleTypeId) return;

    createVersionMutation.mutate(
      {
        cityTypeId,
        payload: {
          vehicleTypeId: values.vehicleTypeId,
          baseFareMinor: Math.round(parseFloat(values.baseFare) * 100),
          perKmRateMinor: Math.round(parseFloat(values.costPerKm) * 100),
          costPerKmMinor: Math.round(parseFloat(values.costPerKm) * 100),
          perMinRateMinor: Math.round(parseFloat(values.costPerMin) * 100),
          costPerMinMinor: Math.round(parseFloat(values.costPerMin) * 100),
          waitingPricePerMinMinor: Math.round(parseFloat(values.waitingCostPerMin) * 100),
          waitingCostPerMinMinor: Math.round(parseFloat(values.waitingCostPerMin) * 100),
          waitingGracePeriodMin: parseInt(values.freeWaitingMinutes, 10),
          freeWaitingMinutes: parseInt(values.freeWaitingMinutes, 10),
          minFareMinor: Math.round(parseFloat(values.minFare) * 100),
          cancellationFeeMinor: Math.round(parseFloat(values.cancellationFee) * 100),
          commissionPercentage: parseFloat(values.commissionPercentage),
          nonSubscriberCommissionRate: (parseFloat(values.commissionPercentage) / 100).toFixed(4),
          platformFeeMinor: Math.round(parseFloat(values.flatCommission) * 100),
          flatCommissionMinor: Math.round(parseFloat(values.flatCommission) * 100),
          isActive: true,
        },
      },
      {
        onSuccess: () => {
          form.reset(emptyCityTypeFareFormValues);
        },
      }
    );
  });

  const handleActivateVersion = (fare: CityTypeFare) => {
    if (!cityTypeId) return;
    activateMutation.mutate({ fareId: fare.id, cityTypeId });
  };

  const handleDelete = (fare: CityTypeFare) => {
    if (!cityTypeId) return;
    if (window.confirm("Permanently delete this historical fare version?")) {
      deleteMutation.mutate({ fareId: fare.id, cityTypeId });
    }
  };

  const activeFares = fares.filter((f) => f.isActive);
  const filteredHistory = selectedVehicleFilter === "ALL"
    ? fares
    : fares.filter((f) => f.vehicleTypeId === selectedVehicleFilter);

  if (isCityTypesLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cityType && !isCityTypesLoading) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/geo")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Locations
        </Button>
        <div className="p-6 border rounded-xl bg-destructive/10 text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>City Tier not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/geo")}
            className="gap-1.5 cursor-pointer text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Geo Tiers
          </Button>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {cityType?.name}
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase font-bold">
                  {cityType?.code}
                </span>
                <Badge variant="outline" className="capitalize text-xs font-normal">
                  Density: {cityType?.densityLevel}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage live rate cards, automatic versioning, driver payout, and commissions per vehicle type.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20 text-xs py-1">
            Max Surge Cap: {Number(cityType?.defaultSurgeCap).toFixed(2)}x
          </Badge>
          <Badge variant="outline" className={cityType?.waitingFeeEnabled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-1" : "text-muted-foreground text-xs py-1"}>
            Waiting Fee: {cityType?.waitingFeeEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </div>

      {/* ── SECTION 1: Active Rates Cards ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Currently Active Vehicle Rates ({activeFares.length})
          </h3>
          <span className="text-xs text-muted-foreground">Applied live to all cities under this tier</span>
        </div>

        {isFaresLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activeFares.length === 0 ? (
          <div className="p-6 border border-dashed rounded-xl text-center text-xs text-muted-foreground bg-muted/20">
            No active vehicle rate cards configured yet. Create a rate card below to activate pricing for this tier.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeFares.map((f) => {
              const matchedVehicle = vehicleTypes.find((v) => v.id === f.vehicleTypeId) || f.vehicleType;
              const perKm = f.costPerKmMinor ?? f.perKmRateMinor ?? 0;
              const perMin = f.costPerMinMinor ?? f.perMinRateMinor ?? 0;
              const baseFare = f.baseFareMinor ?? 0;
              const minFare = f.minFareMinor ?? 0;
              const waitPerMin = f.waitingCostPerMinMinor ?? f.waitingPricePerMinMinor ?? 0;
              const freeWait = f.freeWaitingMinutes ?? f.waitingGracePeriodMin ?? 3;
              const commissionPct = f.commissionPercentage ?? (Number(f.nonSubscriberCommissionRate || 0.2) * 100).toFixed(1);

              return (
                <Card key={f.id} className="border-emerald-500/30 bg-emerald-500/[0.02] shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <CardTitle className="text-sm font-bold text-foreground">
                          {matchedVehicle?.name || f.vehicleTypeName || "Vehicle Type"}
                        </CardTitle>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none text-[10px] font-mono">
                        ACTIVE LIVE
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-[11px] text-muted-foreground">
                      Vehicle: {matchedVehicle?.slug || f.vehicleTypeSlug || f.vehicleTypeId.slice(0, 8)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground font-medium">Base Fare</span>
                        <span className="font-bold text-foreground text-sm">₹{(baseFare / 100).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground font-medium">Per KM</span>
                        <span className="font-bold text-foreground text-sm">₹{(perKm / 100).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground font-medium">Per Min</span>
                        <span className="font-bold text-foreground text-sm">₹{(perMin / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-1">
                      <div>
                        <span className="block text-[10px] uppercase font-medium">Min Fare</span>
                        <span className="font-semibold text-foreground">₹{(minFare / 100).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-medium">Wait / Min</span>
                        <span className="font-semibold text-foreground">₹{(waitPerMin / 100).toFixed(2)} ({freeWait}m free)</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-medium">Commission</span>
                        <span className="font-bold text-sky-600 dark:text-sky-400">{commissionPct}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* ── SECTION 2: Create New Version Form ── */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" />
                Add / Update Rate Card Version
              </CardTitle>
              <CardDescription className="text-xs">
                Publishing a new rate card will immediately activate this version and automatically archive previous versions for that vehicle.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vtf-vehicle" className="text-xs font-semibold">
                    Vehicle Type <span className="text-red-500">*</span>
                  </Label>
                  <NativeSelect id="vtf-vehicle" {...form.register("vehicleTypeId")} className="text-xs">
                    <NativeSelectOption value="">Select vehicle type</NativeSelectOption>
                    {vehicleTypes.map((v) => (
                      <NativeSelectOption key={v.id} value={v.id}>
                        {v.name} {v.slug ? `(${v.slug})` : ""}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {form.formState.errors.vehicleTypeId && (
                    <p className="text-xs text-destructive">{form.formState.errors.vehicleTypeId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-base" className="text-xs">Base Fare (₹)</Label>
                    <Input id="vtf-base" placeholder="50.00" className="text-xs" {...form.register("baseFare")} />
                    {form.formState.errors.baseFare && <p className="text-xs text-destructive">{form.formState.errors.baseFare.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-minFare" className="text-xs">Minimum Fare (₹)</Label>
                    <Input id="vtf-minFare" placeholder="60.00" className="text-xs" {...form.register("minFare")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-costPerKm" className="text-xs">Cost Per KM (₹)</Label>
                    <Input id="vtf-costPerKm" placeholder="12.00" className="text-xs" {...form.register("costPerKm")} />
                    {form.formState.errors.costPerKm && <p className="text-xs text-destructive">{form.formState.errors.costPerKm.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-costPerMin" className="text-xs">Cost Per Minute (₹)</Label>
                    <Input id="vtf-costPerMin" placeholder="1.50" className="text-xs" {...form.register("costPerMin")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-commission" className="text-xs">Platform Commission (%)</Label>
                    <div className="relative">
                      <Input id="vtf-commission" placeholder="15.00" className="text-xs" {...form.register("commissionPercentage")} />
                      <Percent className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-flatCommission" className="text-xs">Flat Commission (₹)</Label>
                    <Input id="vtf-flatCommission" placeholder="0.00" className="text-xs" {...form.register("flatCommission")} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-waitingFee" className="text-xs">Wait Cost/Min</Label>
                    <Input id="vtf-waitingFee" placeholder="2.00" className="text-xs" {...form.register("waitingCostPerMin")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-freeWait" className="text-xs">Free Wait (Min)</Label>
                    <Input id="vtf-freeWait" type="number" placeholder="3" className="text-xs" {...form.register("freeWaitingMinutes")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vtf-cancellation" className="text-xs">Cancel Fee (₹)</Label>
                    <Input id="vtf-cancellation" placeholder="30.00" className="text-xs" {...form.register("cancellationFee")} />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 cursor-pointer mt-2"
                  disabled={createVersionMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  {createVersionMutation.isPending ? "Creating Version..." : "Publish & Activate New Version"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 3: Version History & Switcher ── */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Rate Card Version History
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Switch between versions or review historical pricing changes.
                  </CardDescription>
                </div>
                <div className="w-48">
                  <NativeSelect
                    value={selectedVehicleFilter}
                    onChange={(e) => setSelectedVehicleFilter(e.target.value)}
                    className="text-xs h-8"
                  >
                    <NativeSelectOption value="ALL">All Vehicle Types</NativeSelectOption>
                    {vehicleTypes.map((v) => (
                      <NativeSelectOption key={v.id} value={v.id}>
                        {v.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No rate card history found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredHistory.map((f) => {
                    const matchedVehicle = vehicleTypes.find((v) => v.id === f.vehicleTypeId) || f.vehicleType;
                    const perKm = f.costPerKmMinor ?? f.perKmRateMinor ?? 0;
                    const perMin = f.costPerMinMinor ?? f.perMinRateMinor ?? 0;
                    const baseFare = f.baseFareMinor ?? 0;
                    const commissionPct = f.commissionPercentage ?? (Number(f.nonSubscriberCommissionRate || 0.2) * 100).toFixed(1);

                    return (
                      <div
                        key={f.id}
                        className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs transition-colors ${
                          f.isActive ? "bg-emerald-500/[0.04]" : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {matchedVehicle?.name || f.vehicleTypeName || "Vehicle Rate"}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                f.isActive
                                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold"
                                  : "bg-muted text-muted-foreground border-border text-[10px]"
                              }
                            >
                              {f.isActive ? "ACTIVE VERSION" : "ARCHIVED VERSION"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                            <span>Base: ₹{(baseFare / 100).toFixed(2)}</span>
                            <span>•</span>
                            <span>KM: ₹{(perKm / 100).toFixed(2)}</span>
                            <span>•</span>
                            <span>Min: ₹{(perMin / 100).toFixed(2)}</span>
                            <span>•</span>
                            <span>Comm: {commissionPct}%</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                            <Clock className="h-3 w-3" />
                            Created: {f.createdAt ? new Date(f.createdAt).toLocaleString() : "Unknown"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!f.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivateVersion(f)}
                              disabled={activateMutation.isPending}
                              className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 font-medium"
                              title="Set this version as active and disable all others for this vehicle"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              Activate this Version
                            </Button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pr-2">
                              <ShieldCheck className="h-4 w-4" /> Live Version
                            </span>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(f)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete this historical version"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
