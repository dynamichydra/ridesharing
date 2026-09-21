import { useState, useEffect, useMemo } from "react";
import { Zap, Navigation, RefreshCw, Plus } from "lucide-react";
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
import { useAllZones } from "@/features/zones/hooks";
import toast from "react-hot-toast";

export default function SurgeTollRulesTab() {
  const [surgeRules, setSurgeRules] = useState<any[]>([]);
  const [tollRules, setTollRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [surgeOpen, setSurgeOpen] = useState(false);
  const [tollOpen, setTollOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lookups
  const { data: citiesData } = useCities({ limit: 500 });
  const { data: vehicleTypesData } = useVehicleTypes({ all: "true" });
  const { data: zonesData } = useAllZones();

  const cities = useMemo(() => (citiesData?.MESSAGE as any[]) || [], [citiesData]);
  const vehicleTypes = useMemo(() => (vehicleTypesData?.MESSAGE as any[]) || [], [vehicleTypesData]);
  const zones = useMemo(() => (zonesData?.MESSAGE as any[]) || [], [zonesData]);

  // Form states
  const [surgeForm, setSurgeForm] = useState({
    cityId: "",
    zoneId: "",
    vehicleTypeId: "",
    minRatio: "1.20",
    maxRatio: "2.00",
    multiplier: "1.35",
  });

  const [tollForm, setTollForm] = useState({
    cityId: "",
    name: "Airport Toll Expressway",
    amount: 6000, // ₹60.00
    direction: "both",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [surgeRes, tollRes] = await Promise.all([
        pricingRulesAdminApi.listSurgeRules().catch(() => ({ MESSAGE: [] })),
        pricingRulesAdminApi.listTollRules().catch(() => ({ MESSAGE: [] })),
      ]);
      setSurgeRules(surgeRes.MESSAGE || []);
      setTollRules(tollRes.MESSAGE || []);
    } catch {
      toast.error("Failed to load surge and toll rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSurgeRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeForm.cityId) {
      toast.error("Please select a City");
      return;
    }
    setSubmitting(true);
    try {
      await pricingRulesAdminApi.createSurgeRule({
        cityId: surgeForm.cityId,
        zoneId: surgeForm.zoneId || null,
        vehicleTypeId: surgeForm.vehicleTypeId || null,
        minRatio: surgeForm.minRatio,
        maxRatio: surgeForm.maxRatio || null,
        multiplier: surgeForm.multiplier,
        isActive: true,
      });
      toast.success("Dynamic surge rule created");
      setSurgeOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create surge rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTollRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tollForm.cityId || !tollForm.name) {
      toast.error("Please fill in City and Toll Name");
      return;
    }
    setSubmitting(true);
    try {
      await pricingRulesAdminApi.createTollRule({
        cityId: tollForm.cityId,
        name: tollForm.name,
        amount: Number(tollForm.amount),
        direction: tollForm.direction,
        isActive: true,
      });
      toast.success("Toll rule created");
      setTollOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create toll rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Dynamic Surge & Toll Rules</h3>
            <p className="text-xs text-muted-foreground">Demand/supply ratio threshold bands and bridge/highway pass-through tolls.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Surge Rules */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h4 className="font-semibold text-sm">Dynamic Surge Rules ({surgeRules.length})</h4>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSurgeOpen(true)} className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Surge Band
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">City / Zone</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Multiplier</th>
                  <th className="p-2">Ratio Band</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {surgeRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No surge rules configured
                    </td>
                  </tr>
                ) : (
                  surgeRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2">
                        <span className="font-medium">{r.city?.name || "-"}</span>
                        {r.zone?.name && <span className="text-muted-foreground"> ({r.zone.name})</span>}
                      </td>
                      <td className="p-2">{r.vehicleType?.name || "All Types"}</td>
                      <td className="p-2 font-bold text-amber-600 font-mono">
                        {r.rule?.multiplier || r.multiplier}x
                      </td>
                      <td className="p-2 font-mono text-[10px] text-muted-foreground">
                        {r.rule?.minRatio || "0"} - {r.rule?.maxRatio || "∞"}
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

        {/* Toll Rules */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-500" />
              <h4 className="font-semibold text-sm">Toll & Expressway Matrix ({tollRules.length})</h4>
            </div>
            <Button size="sm" variant="outline" onClick={() => setTollOpen(true)} className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Toll Rule
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Toll Name</th>
                  <th className="p-2">City</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Direction</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tollRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No toll rules configured
                    </td>
                  </tr>
                ) : (
                  tollRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2 font-semibold">{r.rule?.name || r.name}</td>
                      <td className="p-2">{r.city?.name || "-"}</td>
                      <td className="p-2 font-bold text-blue-600">
                        ₹{(((r.rule?.amount || r.amount) || 0) / 100).toFixed(2)}
                      </td>
                      <td className="p-2 uppercase font-semibold text-[10px]">
                        {r.rule?.direction || r.direction}
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

      {/* ── Dialog: Add Surge Rule ────────────────────────────────────────── */}
      <Dialog open={surgeOpen} onOpenChange={setSurgeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              Add Dynamic Surge Ratio Band
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure multiplier when rider request to active driver ratio crosses threshold.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSurgeRule} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">City <span className="text-red-500">*</span></Label>
                <NativeSelect
                  value={surgeForm.cityId}
                  onChange={(e) => setSurgeForm({ ...surgeForm, cityId: e.target.value })}
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

              <div className="space-y-1">
                <Label className="text-xs">Zone (Optional)</Label>
                <NativeSelect
                  value={surgeForm.zoneId}
                  onChange={(e) => setSurgeForm({ ...surgeForm, zoneId: e.target.value })}
                >
                  <NativeSelectOption value="">All Zones</NativeSelectOption>
                  {zones.map((z) => (
                    <NativeSelectOption key={z.id} value={z.id}>
                      {z.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Vehicle Type (Optional)</Label>
              <NativeSelect
                value={surgeForm.vehicleTypeId}
                onChange={(e) => setSurgeForm({ ...surgeForm, vehicleTypeId: e.target.value })}
              >
                <NativeSelectOption value="">All Vehicle Types</NativeSelectOption>
                {vehicleTypes.map((vt) => (
                  <NativeSelectOption key={vt.id} value={vt.id}>
                    {vt.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Min Demand Ratio</Label>
                <Input
                  value={surgeForm.minRatio}
                  onChange={(e) => setSurgeForm({ ...surgeForm, minRatio: e.target.value })}
                  placeholder="1.20"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Demand Ratio</Label>
                <Input
                  value={surgeForm.maxRatio}
                  onChange={(e) => setSurgeForm({ ...surgeForm, maxRatio: e.target.value })}
                  placeholder="2.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Multiplier</Label>
                <Input
                  value={surgeForm.multiplier}
                  onChange={(e) => setSurgeForm({ ...surgeForm, multiplier: e.target.value })}
                  placeholder="1.35"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSurgeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Surge Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Toll Rule ─────────────────────────────────────────── */}
      <Dialog open={tollOpen} onOpenChange={setTollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Navigation className="h-4 w-4 text-blue-500" />
              Add Toll / Expressway Fee Rule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pass-through toll surcharge applied when route passes toll gates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTollRule} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Toll Name</Label>
              <Input
                value={tollForm.name}
                onChange={(e) => setTollForm({ ...tollForm, name: e.target.value })}
                placeholder="e.g. Vidyasagar Setu Toll"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">City <span className="text-red-500">*</span></Label>
                <NativeSelect
                  value={tollForm.cityId}
                  onChange={(e) => setTollForm({ ...tollForm, cityId: e.target.value })}
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

              <div className="space-y-1">
                <Label className="text-xs">Direction</Label>
                <NativeSelect
                  value={tollForm.direction}
                  onChange={(e) => setTollForm({ ...tollForm, direction: e.target.value as any })}
                >
                  <NativeSelectOption value="both">Both Directions</NativeSelectOption>
                  <NativeSelectOption value="inbound">Inbound Only</NativeSelectOption>
                  <NativeSelectOption value="outbound">Outbound Only</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Amount in Minor Units (e.g. 6000 = ₹60.00)</Label>
              <Input
                type="number"
                value={tollForm.amount}
                onChange={(e) => setTollForm({ ...tollForm, amount: Number(e.target.value) })}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTollOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Toll Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
