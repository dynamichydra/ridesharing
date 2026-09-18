import { useState, useEffect } from "react";
import { Plane, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import API from "@/lib/api";

export default function AirportRulesTab() {
  const [airports, setAirports] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apRes, rulesRes] = await Promise.all([
        API.get("/fare/airports?limit=100").catch(() => ({ data: { MESSAGE: [] } })),
        API.get("/fare/airport-rules?limit=100").catch(() => ({ data: { MESSAGE: [] } })),
      ]);
      setAirports(apRes.data?.MESSAGE || []);
      setRules(rulesRes.data?.MESSAGE || []);
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
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Airports & Pricing Rules</h3>
            <p className="text-xs text-muted-foreground">Manage airport hubs and directional pickup/drop surcharges</p>
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
            <h4 className="font-semibold text-sm">Configured Airports ({airports.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Code</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">City</th>
                  <th className="p-2">Pickup/Drop</th>
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
                    <tr key={ap.airport?.id || ap.id} className="border-b border-border/50">
                      <td className="p-2 font-mono font-bold">{ap.airport?.code || ap.code}</td>
                      <td className="p-2">{ap.airport?.name || ap.name}</td>
                      <td className="p-2">{ap.city?.name || "-"}</td>
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

        {/* Airport Pricing Rules Table */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Airport Pricing Rules ({rules.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-2">Airport</th>
                  <th className="p-2">Direction</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Amount / Value</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No airport pricing rules configured yet
                    </td>
                  </tr>
                ) : (
                  rules.map((r: any) => (
                    <tr key={r.rule?.id || r.id} className="border-b border-border/50">
                      <td className="p-2 font-mono font-bold">{r.airport?.code || r.airportCode || "-"}</td>
                      <td className="p-2 uppercase font-semibold text-[10px]">{r.rule?.direction || r.direction}</td>
                      <td className="p-2">{r.vehicleType?.name || "-"}</td>
                      <td className="p-2 font-bold">{r.rule?.value || r.value} ({r.rule?.valueType || r.valueType})</td>
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
