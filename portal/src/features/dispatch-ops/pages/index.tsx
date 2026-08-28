import { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  Plane,
  RefreshCw,
  Sliders,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useActiveDispatchJobs,
  useSupplyDemandMetrics,
  useDispatchPolicies,
  useAirportQueueStatus,
  useUpdateDispatchPolicies,
  useTriggerReconciliation,
} from "../hooks";

export default function DispatchOps() {
  const { data: jobsData } = useActiveDispatchJobs();
  const { data: metricsData } = useSupplyDemandMetrics();
  const { data: policiesData } = useDispatchPolicies();
  const { data: airportData } = useAirportQueueStatus();

  const updatePoliciesMutation = useUpdateDispatchPolicies();
  const reconcileMutation = useTriggerReconciliation();

  const [searchRadius, setSearchRadius] = useState("5");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [offerTimeout, setOfferTimeout] = useState("15");
  const [surgeCap, setSurgeCap] = useState("2.5");
  const [airportEnabled, setAirportEnabled] = useState(true);

  useEffect(() => {
    const p = policiesData?.MESSAGE;
    if (p) {
      if (p.searchRadiusKm) setSearchRadius(String(p.searchRadiusKm));
      if (p.maxDispatchAttempts) setMaxAttempts(String(p.maxDispatchAttempts));
      if (p.offerTimeoutSeconds) setOfferTimeout(String(p.offerTimeoutSeconds));
      if (p.surgeMultiplierCap) setSurgeCap(String(p.surgeMultiplierCap));
      if (p.airportQueueEnabled !== undefined) setAirportEnabled(Boolean(p.airportQueueEnabled));
    }
  }, [policiesData]);

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePoliciesMutation.mutateAsync({
      name: "Global Dispatch Policy",
      searchRadiusKm: parseFloat(searchRadius) || 5,
      maxDispatchAttempts: parseInt(maxAttempts, 10) || 3,
      offerTimeoutSeconds: parseInt(offerTimeout, 10) || 15,
      surgeMultiplierCap: parseFloat(surgeCap) || 2.5,
      airportQueueEnabled: airportEnabled,
    });
  };

  const activeJobs = jobsData?.MESSAGE || [];
  const metrics = metricsData?.MESSAGE || [];
  const airport = airportData?.MESSAGE;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Matching & Dispatch Engine
          </h2>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Engine Online
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${reconcileMutation.isPending ? "animate-spin" : ""}`} />
            Reconcile Queues
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Dispatch Routines
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Real-time driver search jobs</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Airport Queue Status
            </CardTitle>
            <Plane className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {airport?.totalDriversInQueue ?? 0} <span className="text-sm font-normal text-muted-foreground">cabs in FIFO</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Est. wait: {airport?.estimatedWaitMinutes ?? 12} mins
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Surge & Demand Zones
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length || 1} Active Zones</div>
            <p className="text-xs text-muted-foreground mt-1">Dynamic surge balancing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispatch Policy Config */}
        <Card className="lg:col-span-1 border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Dispatch Policy Controls</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Configure broadcast radius and driver timeout windows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePolicies} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="radius">Search Radius (KM)</Label>
                <Input
                  id="radius"
                  type="number"
                  step="0.5"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="attempts">Max Dispatch Attempts</Label>
                <Input
                  id="attempts"
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timeout">Driver Offer Timeout (Seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={offerTimeout}
                  onChange={(e) => setOfferTimeout(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="surge">Max Surge Multiplier Cap</Label>
                <Input
                  id="surge"
                  type="number"
                  step="0.1"
                  value={surgeCap}
                  onChange={(e) => setSurgeCap(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="airport">Airport FIFO Queue</Label>
                <Switch
                  id="airport"
                  checked={airportEnabled}
                  onCheckedChange={setAirportEnabled}
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={updatePoliciesMutation.isPending}
              >
                {updatePoliciesMutation.isPending ? "Saving..." : "Apply Policy Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live Dispatch Jobs Stream */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                <CardTitle className="text-base">Live Active Dispatch Queue</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-mono">Auto-refreshes 5s</span>
            </div>
          </CardHeader>
          <CardContent>
            {activeJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 stroke-1 mb-2 opacity-40" />
                <p className="text-sm font-medium">All dispatch queues are clear</p>
                <p className="text-xs opacity-70">No pending driver allocations at this moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job, idx) => (
                  <div
                    key={job.rideId || idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-foreground">
                        Ride #{job.rideId}
                      </span>
                      <span className="text-muted-foreground mt-0.5">
                        Attempt {job.attempt} • {job.candidateDriverIds?.length || 0} candidates queried
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse font-mono">
                      {job.status || "DISPATCHING"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
