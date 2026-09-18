import { useState, useEffect } from "react";
import { Zap, Navigation, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import API from "@/lib/api";

export default function SurgeTollRulesTab() {
  const [surgeRules, setSurgeRules] = useState<any[]>([]);
  const [tollRules, setTollRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [surgeRes, tollRes] = await Promise.all([
        API.get("/fare/surge-rules?limit=100").catch(() => ({ data: { MESSAGE: [] } })),
        API.get("/fare/toll-rules?limit=100").catch(() => ({ data: { MESSAGE: [] } })),
      ]);
      setSurgeRules(surgeRes.data?.MESSAGE || []);
      setTollRules(tollRes.data?.MESSAGE || []);
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
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Dynamic Surge & Toll Rules</h3>
            <p className="text-xs text-muted-foreground">Demand/supply surge ratio thresholds and cross-zone toll matrices</p>
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
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Dynamic Surge Rules ({surgeRules.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">City/Zone</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Multiplier</th>
                  <th className="p-2">Ratio Band</th>
                </tr>
              </thead>
              <tbody>
                {surgeRules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No surge rules configured
                    </td>
                  </tr>
                ) : (
                  surgeRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50">
                      <td className="p-2">{r.city?.name || "-"} / {r.zone?.name || "All"}</td>
                      <td className="p-2">{r.vehicleType?.name || "-"}</td>
                      <td className="p-2 font-bold text-amber-600 font-mono">{r.rule?.multiplier || r.multiplier}x</td>
                      <td className="p-2 font-mono text-[10px]">{r.rule?.minRatio || "0"} - {r.rule?.maxRatio || "∞"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Toll Rules */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-500" />
            <h4 className="font-semibold text-sm">Toll & Highway Matrix ({tollRules.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">City</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Direction</th>
                </tr>
              </thead>
              <tbody>
                {tollRules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No toll rules configured
                    </td>
                  </tr>
                ) : (
                  tollRules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50">
                      <td className="p-2 font-semibold">{r.rule?.name || r.name}</td>
                      <td className="p-2">{r.city?.name || "-"}</td>
                      <td className="p-2 font-bold">₹{((r.rule?.amount || r.amount) / 100).toFixed(2)}</td>
                      <td className="p-2 uppercase font-semibold text-[10px]">{r.rule?.direction || r.direction}</td>
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
