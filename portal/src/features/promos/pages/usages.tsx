import { useState, useEffect } from "react";
import { TicketPercent, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import API from "@/lib/api";

export default function PromoUsagesTab() {
  const [usages, setUsages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsages = async () => {
    setLoading(true);
    try {
      const res = await API.get("/promos/usages?limit=50");
      setUsages(res.data?.MESSAGE || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsages();
  }, []);

  const totalSubsidyMinor = usages.reduce((sum, u) => sum + (u.usage?.discountAmountMinor || u.discountAmountMinor || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <TicketPercent className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Promo Redemptions &amp; Subsidies Audit</h3>
            <p className="text-xs text-muted-foreground">
              Track rider discounts applied and marketing subsidies absorbed by platform (Driver earnings unpenalized)
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchUsages} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">Total Redemptions</span>
          <span className="text-2xl font-bold text-foreground">{usages.length}</span>
          <span className="text-[10px] text-muted-foreground block">Tracked across all promo codes</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">Platform Marketing Subsidy</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            ₹{(totalSubsidyMinor / 100).toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Absorbed by platform on behalf of rider</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">Driver Protection Policy</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
            <ShieldCheck className="h-4 w-4" /> 100% Guaranteed Gross
          </span>
          <span className="text-[10px] text-muted-foreground block">Driver payout calculated on un-discounted gross</span>
        </div>
      </div>

      {/* Redemptions Table */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <h4 className="font-semibold text-sm">Recent Redemptions Log</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="p-2.5">Promo Code</th>
                <th className="p-2.5">Rider / User</th>
                <th className="p-2.5">Ride ID</th>
                <th className="p-2.5">Rider Discount</th>
                <th className="p-2.5">Platform Subsidy</th>
                <th className="p-2.5">Redemption Date</th>
              </tr>
            </thead>
            <tbody>
              {usages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No promo redemptions recorded yet
                  </td>
                </tr>
              ) : (
                usages.map((u: any) => {
                  const row = u.usage || u;
                  const promo = u.promo || {};
                  const user = u.user || {};
                  const discountMinor = row.discountAmountMinor || 0;
                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-2.5 font-mono font-bold text-primary">{promo.code || row.promoId?.slice(0, 8)}</td>
                      <td className="p-2.5">
                        <span className="font-medium">{user.fullName || user.phone || row.userId?.slice(0, 8)}</span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                        {row.rideId ? row.rideId.slice(0, 8) + "..." : "Initial Reservation"}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600">
                        -₹{(discountMinor / 100).toFixed(2)}
                      </td>
                      <td className="p-2.5 font-bold text-amber-600">
                        +₹{(discountMinor / 100).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {new Date(row.usedAt || row.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
