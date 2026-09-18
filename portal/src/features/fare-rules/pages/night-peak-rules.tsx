import { useState, useEffect } from "react";
import { Moon, Sun, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import API from "@/lib/api";

export default function NightPeakRulesTab() {
  const [nightRules, setNightRules] = useState<any[]>([]);
  const [peakRules, setPeakRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nightRes, peakRes] = await Promise.all([
        API.get("/fare/night-rules?limit=100").catch(() => ({ data: { MESSAGE: [] } })),
        API.get("/fare/peak-rules?limit=100").catch(() => ({ data: { MESSAGE: [] } })),
      ]);
      setNightRules(nightRes.data?.MESSAGE || []);
      setPeakRules(peakRes.data?.MESSAGE || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Moon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Night & Peak Hours Rules</h3>
            <p className="text-xs text-muted-foreground">Time-based scheduled recurring surcharges and multipliers</p>
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
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-500" />
            <h4 className="font-semibold text-sm">Night Surcharge Rules ({nightRules.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Time Window</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Value</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {nightRules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No night pricing rules configured
                    </td>
                  </tr>
                ) : (
                  nightRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50">
                      <td className="p-2 font-mono">{r.rule?.startTime || r.startTime} - {r.rule?.endTime || r.endTime}</td>
                      <td className="p-2">{r.vehicleType?.name || "-"}</td>
                      <td className="p-2 font-bold">{r.rule?.value || r.value} ({r.rule?.valueType || r.valueType})</td>
                      <td className="p-2">
                        <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">Active</span>
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
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Peak Hours Rules ({peakRules.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Time Window</th>
                  <th className="p-2">Value</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {peakRules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No peak hours rules configured
                    </td>
                  </tr>
                ) : (
                  peakRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50">
                      <td className="p-2 font-semibold">{r.rule?.name || r.name}</td>
                      <td className="p-2 font-mono">{r.rule?.startTime || r.startTime} - {r.rule?.endTime || r.endTime}</td>
                      <td className="p-2 font-bold">{r.rule?.value || r.value} ({r.rule?.valueType || r.valueType})</td>
                      <td className="p-2">
                        <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">Active</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
