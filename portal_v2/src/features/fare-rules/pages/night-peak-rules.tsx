import { useState, useEffect, useMemo } from "react";
import { Moon, Sun, RefreshCw, Plus, Clock } from "lucide-react";
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
import { pricingRulesAdminApi, pricingPlansApi } from "../api";
import { useVehicleTypes } from "@/features/vehicle-types/hooks";
import toast from "react-hot-toast";

export default function NightPeakRulesTab() {
  const [nightRules, setNightRules] = useState<any[]>([]);
  const [peakRules, setPeakRules] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [nightOpen, setNightOpen] = useState(false);
  const [peakOpen, setPeakOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lookups
  const { data: vehicleTypesData } = useVehicleTypes({ all: "true" });
  const vehicleTypes = useMemo(() => (vehicleTypesData?.MESSAGE as any[]) || [], [vehicleTypesData]);

  // Form State
  const [nightForm, setNightForm] = useState({
    pricingPlanId: "",
    vehicleTypeId: "",
    startTime: "23:00",
    endTime: "05:00",
    valueType: "multiplier",
    value: "1.25",
  });

  const [peakForm, setPeakForm] = useState({
    name: "Morning Rush Hour",
    pricingPlanId: "",
    vehicleTypeId: "",
    startTime: "08:30",
    endTime: "11:30",
    valueType: "multiplier",
    value: "1.20",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nightRes, peakRes, plansRes] = await Promise.all([
        pricingRulesAdminApi.listNightRules().catch(() => ({ MESSAGE: [] })),
        pricingRulesAdminApi.listPeakRules().catch(() => ({ MESSAGE: [] })),
        pricingPlansApi.list({ limit: 100 }).catch(() => ({ MESSAGE: [] })),
      ]);
      setNightRules(nightRes.MESSAGE || []);
      setPeakRules(peakRes.MESSAGE || []);
      setPlans(plansRes.MESSAGE || []);
    } catch {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNightRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pricingRulesAdminApi.createNightRule({
        pricingPlanId: nightForm.pricingPlanId || null,
        vehicleTypeId: nightForm.vehicleTypeId || null,
        startTime: nightForm.startTime,
        endTime: nightForm.endTime,
        valueType: nightForm.valueType,
        value: nightForm.value,
        isActive: true,
      });
      toast.success("Night surcharge rule created");
      setNightOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create night rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePeakRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pricingRulesAdminApi.createPeakRule({
        name: peakForm.name,
        pricingPlanId: peakForm.pricingPlanId || null,
        vehicleTypeId: peakForm.vehicleTypeId || null,
        startTime: peakForm.startTime,
        endTime: peakForm.endTime,
        valueType: peakForm.valueType,
        value: peakForm.value,
        isActive: true,
      });
      toast.success("Peak hour rule created");
      setPeakOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create peak rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Moon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Night & Peak Hours Rules</h3>
            <p className="text-xs text-muted-foreground">
              Automated recurring time-window surcharges and demand multipliers applied to pricing plans.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Night Pricing Rules */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-500" />
              <h4 className="font-semibold text-sm">Night Surcharge Rules ({nightRules.length})</h4>
            </div>
            <Button size="sm" variant="outline" onClick={() => setNightOpen(true)} className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Night Rule
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Plan / Scope</th>
                  <th className="p-2">Time Window</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Multiplier / Value</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {nightRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No night pricing rules configured
                    </td>
                  </tr>
                ) : (
                  nightRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2 font-medium">{r.plan?.name || "Global / All Plans"}</td>
                      <td className="p-2 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground inline" />
                        {r.rule?.startTime || r.startTime} - {r.rule?.endTime || r.endTime}
                      </td>
                      <td className="p-2">{r.vehicleType?.name || "All Types"}</td>
                      <td className="p-2 font-bold text-indigo-600">
                        {r.rule?.value || r.value} ({r.rule?.valueType || r.valueType})
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

        {/* Peak Pricing Rules */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              <h4 className="font-semibold text-sm">Peak Hours Rules ({peakRules.length})</h4>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPeakOpen(true)} className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Peak Rule
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Plan / Scope</th>
                  <th className="p-2">Time Window</th>
                  <th className="p-2">Multiplier</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {peakRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No peak hours rules configured
                    </td>
                  </tr>
                ) : (
                  peakRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2 font-semibold">{r.rule?.name || r.name}</td>
                      <td className="p-2 text-muted-foreground">{r.plan?.name || "Global / All"}</td>
                      <td className="p-2 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground inline" />
                        {r.rule?.startTime || r.startTime} - {r.rule?.endTime || r.endTime}
                      </td>
                      <td className="p-2 font-bold text-amber-600">
                        {r.rule?.value || r.value} ({r.rule?.valueType || r.valueType})
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

      {/* ── Dialog: Add Night Rule ────────────────────────────────────────── */}
      <Dialog open={nightOpen} onOpenChange={setNightOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4 text-indigo-500" />
              Configure Night Surcharge Rule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply a late-night percentage multiplier or flat fee during night hours.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNightRule} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Target Pricing Plan (Optional)</Label>
              <NativeSelect
                value={nightForm.pricingPlanId}
                onChange={(e) => setNightForm({ ...nightForm, pricingPlanId: e.target.value })}
              >
                <NativeSelectOption value="">Global / All Pricing Plans</NativeSelectOption>
                {plans.map((p: any) => (
                  <NativeSelectOption key={p.plan?.id || p.id} value={p.plan?.id || p.id}>
                    {p.plan?.name || p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Vehicle Type (Optional)</Label>
              <NativeSelect
                value={nightForm.vehicleTypeId}
                onChange={(e) => setNightForm({ ...nightForm, vehicleTypeId: e.target.value })}
              >
                <NativeSelectOption value="">All Vehicle Types</NativeSelectOption>
                {vehicleTypes.map((vt) => (
                  <NativeSelectOption key={vt.id} value={vt.id}>
                    {vt.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start Time (HH:MM)</Label>
                <Input
                  value={nightForm.startTime}
                  onChange={(e) => setNightForm({ ...nightForm, startTime: e.target.value })}
                  placeholder="23:00"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time (HH:MM)</Label>
                <Input
                  value={nightForm.endTime}
                  onChange={(e) => setNightForm({ ...nightForm, endTime: e.target.value })}
                  placeholder="05:00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Value Type</Label>
                <NativeSelect
                  value={nightForm.valueType}
                  onChange={(e) => setNightForm({ ...nightForm, valueType: e.target.value as any })}
                >
                  <NativeSelectOption value="multiplier">Multiplier (e.g. 1.25x)</NativeSelectOption>
                  <NativeSelectOption value="flat">Flat Surcharge (in minor units)</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input
                  value={nightForm.value}
                  onChange={(e) => setNightForm({ ...nightForm, value: e.target.value })}
                  placeholder="1.25"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setNightOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Night Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Peak Rule ─────────────────────────────────────────── */}
      <Dialog open={peakOpen} onOpenChange={setPeakOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sun className="h-4 w-4 text-amber-500" />
              Configure Peak Hours Rule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply a surge multiplier during high-demand commute windows.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePeakRule} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Rule Name</Label>
              <Input
                value={peakForm.name}
                onChange={(e) => setPeakForm({ ...peakForm, name: e.target.value })}
                placeholder="e.g. Morning Rush Hour"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Target Pricing Plan (Optional)</Label>
              <NativeSelect
                value={peakForm.pricingPlanId}
                onChange={(e) => setPeakForm({ ...peakForm, pricingPlanId: e.target.value })}
              >
                <NativeSelectOption value="">Global / All Pricing Plans</NativeSelectOption>
                {plans.map((p: any) => (
                  <NativeSelectOption key={p.plan?.id || p.id} value={p.plan?.id || p.id}>
                    {p.plan?.name || p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start Time (HH:MM)</Label>
                <Input
                  value={peakForm.startTime}
                  onChange={(e) => setPeakForm({ ...peakForm, startTime: e.target.value })}
                  placeholder="08:30"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time (HH:MM)</Label>
                <Input
                  value={peakForm.endTime}
                  onChange={(e) => setPeakForm({ ...peakForm, endTime: e.target.value })}
                  placeholder="11:30"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Value Type</Label>
                <NativeSelect
                  value={peakForm.valueType}
                  onChange={(e) => setPeakForm({ ...peakForm, valueType: e.target.value as any })}
                >
                  <NativeSelectOption value="multiplier">Multiplier (e.g. 1.20x)</NativeSelectOption>
                  <NativeSelectOption value="flat">Flat Surcharge</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Multiplier Value</Label>
                <Input
                  value={peakForm.value}
                  onChange={(e) => setPeakForm({ ...peakForm, value: e.target.value })}
                  placeholder="1.20"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPeakOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Peak Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
