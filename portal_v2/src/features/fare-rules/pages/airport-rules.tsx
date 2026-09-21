import { useState, useEffect, useMemo } from "react";
import { Plane, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { pricingRulesAdminApi } from "../api";
import { useCities } from "@/features/geo/hooks";
import { useVehicleTypes } from "@/features/vehicle-types/hooks";
import toast from "react-hot-toast";

export default function AirportRulesTab() {
  const [airports, setAirports] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [airportOpen, setAirportOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lookups
  const { data: citiesData } = useCities({ limit: 500 });
  const { data: vehicleTypesData } = useVehicleTypes({ all: "true" });

  const cities = useMemo(() => (citiesData?.MESSAGE as any[]) || [], [citiesData]);
  const vehicleTypes = useMemo(() => (vehicleTypesData?.MESSAGE as any[]) || [], [vehicleTypesData]);

  // Form states
  const [airportForm, setAirportForm] = useState({
    cityId: "",
    zoneId: "",
    code: "CCU",
    name: "Netaji Subhash Chandra Bose International Airport",
    latitude: "22.6547",
    longitude: "88.4467",
  });

  const [ruleForm, setRuleForm] = useState({
    airportId: "",
    vehicleTypeId: "",
    direction: "both",
    valueType: "flat",
    value: "10000", // ₹100.00
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apRes, rulesRes] = await Promise.all([
        pricingRulesAdminApi.listAirports().catch(() => ({ MESSAGE: [] })),
        pricingRulesAdminApi.listAirportRules().catch(() => ({ MESSAGE: [] })),
      ]);
      setAirports(apRes.MESSAGE || []);
      setRules(rulesRes.MESSAGE || []);
    } catch {
      toast.error("Failed to load airports and rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!airportForm.cityId || !airportForm.code || !airportForm.name) {
      toast.error("Please fill in City, Code, and Airport Name");
      return;
    }
    setSubmitting(true);
    try {
      await pricingRulesAdminApi.createAirport({
        cityId: airportForm.cityId,
        zoneId: airportForm.zoneId || null,
        code: airportForm.code.toUpperCase(),
        name: airportForm.name,
        latitude: airportForm.latitude,
        longitude: airportForm.longitude,
        isActive: true,
      });
      toast.success("Airport hub created");
      setAirportOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create airport");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAirportRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.airportId) {
      toast.error("Please select an Airport");
      return;
    }
    setSubmitting(true);
    try {
      await pricingRulesAdminApi.createAirportRule({
        airportId: ruleForm.airportId,
        vehicleTypeId: ruleForm.vehicleTypeId || null,
        direction: ruleForm.direction,
        valueType: ruleForm.valueType,
        value: ruleForm.value,
        isActive: true,
      });
      toast.success("Airport surcharge rule created");
      setRuleOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create airport rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Airports & Pricing Rules</h3>
            <p className="text-xs text-muted-foreground">Manage airport hubs and directional pickup/drop surcharges and toll passes.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Airports Master Table */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-sky-500" />
              <h4 className="font-semibold text-sm">Configured Airports ({airports.length})</h4>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAirportOpen(true)} className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Airport
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Code</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">City</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {airports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No airports configured yet
                    </td>
                  </tr>
                ) : (
                  airports.map((ap: any) => (
                    <tr key={ap.airport?.id || ap.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2 font-mono font-bold text-sky-600">{ap.airport?.code || ap.code}</td>
                      <td className="p-2 font-medium">{ap.airport?.name || ap.name}</td>
                      <td className="p-2">{ap.city?.name || "-"}</td>
                      <td className="p-2">
                        <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-semibold">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Airport Pricing Rules Table */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-indigo-500" />
              <h4 className="font-semibold text-sm">Airport Surcharges ({rules.length})</h4>
            </div>
            <Button size="sm" variant="outline" onClick={() => setRuleOpen(true)} className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Surcharge
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Airport</th>
                  <th className="p-2">Direction</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Amount / Value</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No airport pricing rules configured yet
                    </td>
                  </tr>
                ) : (
                  rules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2 font-mono font-bold text-indigo-600">
                        {r.airport?.code || r.airportCode || "-"}
                      </td>
                      <td className="p-2 uppercase font-semibold text-[10px] text-muted-foreground">
                        {r.rule?.direction || r.direction}
                      </td>
                      <td className="p-2">{r.vehicleType?.name || "All Types"}</td>
                      <td className="p-2 font-bold text-foreground">
                        {r.rule?.valueType === "flat"
                          ? `₹${((Number(r.rule?.value || r.value) || 0) / 100).toFixed(2)}`
                          : `${r.rule?.value || r.value}x`}
                      </td>
                      <td className="p-2">
                        <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-semibold">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Dialog: Add Airport ────────────────────────────────────────────── */}
      <Dialog open={airportOpen} onOpenChange={setAirportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4 text-sky-500" />
              Add Airport Hub
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register an airport geofence for directional pickup/drop-off fee automation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAirport} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Airport IATA Code (e.g. CCU)</Label>
                <Input
                  value={airportForm.code}
                  onChange={(e) => setAirportForm({ ...airportForm, code: e.target.value })}
                  placeholder="CCU"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">City <span className="text-red-500">*</span></Label>
                <NativeSelect
                  value={airportForm.cityId}
                  onChange={(e) => setAirportForm({ ...airportForm, cityId: e.target.value })}
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
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Airport Name</Label>
              <Input
                value={airportForm.name}
                onChange={(e) => setAirportForm({ ...airportForm, name: e.target.value })}
                placeholder="e.g. Netaji Subhash Chandra Bose International"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Latitude</Label>
                <Input
                  value={airportForm.latitude}
                  onChange={(e) => setAirportForm({ ...airportForm, latitude: e.target.value })}
                  placeholder="22.6547"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Longitude</Label>
                <Input
                  value={airportForm.longitude}
                  onChange={(e) => setAirportForm({ ...airportForm, longitude: e.target.value })}
                  placeholder="88.4467"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAirportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Airport"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Airport Surcharge Rule ─────────────────────────────── */}
      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4 text-indigo-500" />
              Add Airport Surcharge Rule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure airport pickup/drop-off flat fee or multiplier surcharge.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAirportRule} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Airport <span className="text-red-500">*</span></Label>
              <NativeSelect
                value={ruleForm.airportId}
                onChange={(e) => setRuleForm({ ...ruleForm, airportId: e.target.value })}
                required
              >
                <NativeSelectOption value="">Select Airport</NativeSelectOption>
                {airports.map((ap: any) => (
                  <NativeSelectOption key={ap.airport?.id || ap.id} value={ap.airport?.id || ap.id}>
                    {ap.airport?.code || ap.code} — {ap.airport?.name || ap.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Direction</Label>
                <NativeSelect
                  value={ruleForm.direction}
                  onChange={(e) => setRuleForm({ ...ruleForm, direction: e.target.value as any })}
                >
                  <NativeSelectOption value="both">Both Pickup & Drop</NativeSelectOption>
                  <NativeSelectOption value="pickup">Pickup Only</NativeSelectOption>
                  <NativeSelectOption value="dropoff">Drop-off Only</NativeSelectOption>
                </NativeSelect>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Vehicle Type (Optional)</Label>
                <NativeSelect
                  value={ruleForm.vehicleTypeId}
                  onChange={(e) => setRuleForm({ ...ruleForm, vehicleTypeId: e.target.value })}
                >
                  <NativeSelectOption value="">All Vehicle Types</NativeSelectOption>
                  {vehicleTypes.map((vt) => (
                    <NativeSelectOption key={vt.id} value={vt.id}>
                      {vt.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Fee Type</Label>
                <NativeSelect
                  value={ruleForm.valueType}
                  onChange={(e) => setRuleForm({ ...ruleForm, valueType: e.target.value as any })}
                >
                  <NativeSelectOption value="flat">Flat Amount (minor units)</NativeSelectOption>
                  <NativeSelectOption value="multiplier">Multiplier</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value (e.g. 10000 = ₹100.00)</Label>
                <Input
                  value={ruleForm.value}
                  onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })}
                  placeholder="10000"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRuleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Surcharge Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
