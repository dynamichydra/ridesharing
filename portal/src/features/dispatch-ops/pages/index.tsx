import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Cpu,
  Plane,
  RefreshCw,
  Sliders,
  TrendingUp,
  Users,
  Plus,
  Trash2,
  Radio,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  useActiveDispatchJobs,
  useSupplyDemandMetrics,
  useDispatchPolicies,
  useAirportQueueStatus,
  useUpdateDispatchPolicies,
  useDeleteDispatchPolicy,
  useTriggerReconciliation,
} from "../hooks";
import type { DispatchPolicy } from "../types";

const SCOPE_COLORS: Record<string, { badge: string; border: string; label: string }> = {
  global: {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    border: "border-blue-500/30",
    label: "Global Default",
  },
  city: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    border: "border-emerald-500/30",
    label: "City Regional",
  },
  zone: {
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    border: "border-purple-500/30",
    label: "Zone Specific",
  },
  country: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    border: "border-amber-500/30",
    label: "Country Wide",
  },
  service_type: {
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    border: "border-rose-500/30",
    label: "Service Type",
  },
};

export default function DispatchOps() {
  const { data: jobsData } = useActiveDispatchJobs();
  const { data: metricsData } = useSupplyDemandMetrics();
  const { data: policiesData, isLoading: isLoadingPolicies } = useDispatchPolicies();
  const { data: airportData } = useAirportQueueStatus();

  const updatePoliciesMutation = useUpdateDispatchPolicies();
  const deletePolicyMutation = useDeleteDispatchPolicy();
  const reconcileMutation = useTriggerReconciliation();

  // Raw policies from backend
  const policies: DispatchPolicy[] = useMemo(() => {
    const raw = policiesData?.MESSAGE;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") return [raw as DispatchPolicy];
    return [];
  }, [policiesData]);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    version: "v1.0.0",
    scope: "global",
    initialRadiusKm: "1.50",
    maxRadiusKm: "15.00",
    radiusStepKm: "2.00",
    offerTimeoutSeconds: "15",
    maxWaves: "4",
    maxCandidatesPerWave: "5",
    cooldownSeconds: "60",
    maxEtaMinutes: "20",
    isActive: true,
    weights: {
      etaWeight: 0.40,
      distanceWeight: 0.15,
      idleWeight: 0.10,
      ratingWeight: 0.10,
      acceptanceRateWeight: 0.10,
      cancellationRateWeight: 0.05,
    },
  });

  // Automatically select first policy on load
  useEffect(() => {
    if (policies.length > 0 && !selectedPolicyId && !isCreatingNew) {
      setSelectedPolicyId(policies[0].id || null);
    }
  }, [policies, selectedPolicyId, isCreatingNew]);

  // When selected policy changes, sync form state
  useEffect(() => {
    if (isCreatingNew) {
      setFormData({
        name: "New Dispatch Policy",
        version: "v1.0.0",
        scope: "city",
        initialRadiusKm: "1.50",
        maxRadiusKm: "15.00",
        radiusStepKm: "2.00",
        offerTimeoutSeconds: "15",
        maxWaves: "4",
        maxCandidatesPerWave: "5",
        cooldownSeconds: "60",
        maxEtaMinutes: "20",
        isActive: true,
        weights: {
          etaWeight: 0.40,
          distanceWeight: 0.15,
          idleWeight: 0.10,
          ratingWeight: 0.10,
          acceptanceRateWeight: 0.10,
          cancellationRateWeight: 0.05,
        },
      });
      return;
    }

    const current = policies.find((p) => p.id === selectedPolicyId);
    if (current) {
      setFormData({
        name: current.name || "Dispatch Policy",
        version: current.version || "v1.0.0",
        scope: current.scope || "global",
        initialRadiusKm: String(current.initialRadiusKm || "1.50"),
        maxRadiusKm: String(current.maxRadiusKm || "15.00"),
        radiusStepKm: String(current.radiusStepKm || "2.00"),
        offerTimeoutSeconds: String(current.offerTimeoutSeconds || 15),
        maxWaves: String(current.maxWaves || 4),
        maxCandidatesPerWave: String(current.maxCandidatesPerWave || 5),
        cooldownSeconds: String(current.cooldownSeconds || 60),
        maxEtaMinutes: String(current.maxEtaMinutes || 20),
        isActive: current.isActive !== false,
        weights: {
          etaWeight: current.weights?.etaWeight ?? 0.40,
          distanceWeight: current.weights?.distanceWeight ?? 0.15,
          idleWeight: current.weights?.idleWeight ?? 0.10,
          ratingWeight: current.weights?.ratingWeight ?? 0.10,
          acceptanceRateWeight: current.weights?.acceptanceRateWeight ?? 0.10,
          cancellationRateWeight: current.weights?.cancellationRateWeight ?? 0.05,
        },
      });
    }
  }, [selectedPolicyId, isCreatingNew, policies]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<DispatchPolicy> = {
      ...(isCreatingNew ? {} : { id: selectedPolicyId || undefined }),
      name: formData.name.trim(),
      version: formData.version,
      scope: formData.scope,
      initialRadiusKm: parseFloat(formData.initialRadiusKm) || 1.5,
      maxRadiusKm: parseFloat(formData.maxRadiusKm) || 15.0,
      radiusStepKm: parseFloat(formData.radiusStepKm) || 2.0,
      offerTimeoutSeconds: parseInt(formData.offerTimeoutSeconds, 10) || 15,
      maxWaves: parseInt(formData.maxWaves, 10) || 4,
      maxCandidatesPerWave: parseInt(formData.maxCandidatesPerWave, 10) || 5,
      cooldownSeconds: parseInt(formData.cooldownSeconds, 10) || 60,
      maxEtaMinutes: parseInt(formData.maxEtaMinutes, 10) || 20,
      weights: formData.weights,
      isActive: formData.isActive,
    };

    const saved: any = await updatePoliciesMutation.mutateAsync(payload);
    setIsCreatingNew(false);
    if (saved?.id) {
      setSelectedPolicyId(saved.id);
    }
  };

  const handleDeletePolicy = async (policyId: string, policyName: string) => {
    if (!window.confirm(`Are you sure you want to delete policy "${policyName}"?`)) return;
    await deletePolicyMutation.mutateAsync(policyId);
    if (selectedPolicyId === policyId) {
      const remaining = policies.filter((p) => p.id !== policyId);
      setSelectedPolicyId(remaining[0]?.id || null);
    }
  };

  const activeJobs = jobsData?.MESSAGE || [];
  const metrics = metricsData?.MESSAGE || [];
  const airport = airportData?.MESSAGE;

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
              Matching & Dispatch Operations
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
              Engine Online
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hierarchical dispatch resolution: Service Type → Zone → City → Country → Global Default
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
            className="cursor-pointer text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${reconcileMutation.isPending ? "animate-spin" : ""}`} />
            Reconcile Queues
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setIsCreatingNew(true);
              setSelectedPolicyId(null);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Policies
            </CardTitle>
            <Sliders className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {policies.filter((p) => p.isActive).length} active • {policies.filter((p) => !p.isActive).length} disabled
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Dispatch Jobs
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Live driver broadcast waves</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Airport FIFO Queue
            </CardTitle>
            <Plane className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {airport?.totalDriversInQueue ?? 0} <span className="text-xs font-normal text-muted-foreground">cabs in FIFO</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Est. wait: {airport?.estimatedWaitMinutes ?? 12} mins
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Surge & Demand
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length || 1} Active Zones</div>
            <p className="text-xs text-muted-foreground mt-1">Real-time surge balancing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Layout: Policy List on Left, Editor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: All Configured Policies */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" /> Configured Policies ({policies.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Select a policy below to inspect or configure rules
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreatingNew(true);
                    setSelectedPolicyId(null);
                  }}
                  className="text-xs cursor-pointer h-7 gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5 max-h-[600px] overflow-y-auto">
              {isLoadingPolicies ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading dispatch policies...
                </div>
              ) : policies.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No dispatch policies found. Create your first policy.
                </div>
              ) : (
                policies.map((p) => {
                  const isSelected = !isCreatingNew && selectedPolicyId === p.id;
                  const scopeMeta = SCOPE_COLORS[p.scope] || SCOPE_COLORS.global;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setIsCreatingNew(false);
                        setSelectedPolicyId(p.id || null);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {p.name}
                            </span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${scopeMeta.badge}`}>
                              {scopeMeta.label}
                            </Badge>
                            {p.isActive ? (
                              <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">● Active</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-medium">○ Inactive</span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                            ID: {p.id?.slice(0, 8)}... • {p.version || "v1.0.0"}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.id) handleDeletePolicy(p.id, p.name);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Summary Badges */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold">Radius</span>
                          <span className="font-mono text-foreground font-medium">{p.initialRadiusKm}-{p.maxRadiusKm} km</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-semibold">Timeout</span>
                          <span className="font-mono text-foreground font-medium">{p.offerTimeoutSeconds}s</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-semibold">Waves</span>
                          <span className="font-mono text-foreground font-medium">{p.maxWaves} waves</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick Context Card */}
          <Card className="border-border/60 bg-muted/20 shadow-xs">
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-4 w-4 text-primary" /> How Policy Hierarchies Work
              </div>
              <p>
                When a ride request arrives, the matching engine searches for the most specific active policy matching the ride:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li><strong className="text-foreground">Service Type Policy</strong> (e.g. Luxury / XL)</li>
                <li><strong className="text-foreground">Zone Policy</strong> (e.g. Airport, Downtown Hub)</li>
                <li><strong className="text-foreground">City Policy</strong> (e.g. Kolkata, London)</li>
                <li><strong className="text-foreground">Global Policy</strong> (Standard fallback)</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Policy Configuration Editor */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    {isCreatingNew
                      ? "Create New Dispatch Policy"
                      : `Configure: ${formData.name || "Dispatch Policy"}`}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {isCreatingNew
                      ? "Define a new broadcast search radius and timing rule"
                      : `Modifying policy ID: ${selectedPolicyId || "—"}`}
                  </CardDescription>
                </div>

                {!isCreatingNew && selectedPolicy && (
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 capitalize ${SCOPE_COLORS[selectedPolicy.scope]?.badge || ""}`}>
                    {SCOPE_COLORS[selectedPolicy.scope]?.label || selectedPolicy.scope}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <form onSubmit={handleSavePolicy} className="space-y-5">
                {/* 1. Identity & Scope */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    1. Policy Identity & Scope
                  </span>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pol-name" className="text-xs">Policy Name *</Label>
                      <Input
                        id="pol-name"
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. City Dispatch Policy"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pol-scope" className="text-xs">Scope Target *</Label>
                      <NativeSelect
                        id="pol-scope"
                        value={formData.scope}
                        onChange={(e) => setFormData((p) => ({ ...p, scope: e.target.value }))}
                      >
                        <NativeSelectOption value="global">Global (Platform Default)</NativeSelectOption>
                        <NativeSelectOption value="city">City (Metropolitan Override)</NativeSelectOption>
                        <NativeSelectOption value="zone">Zone (Airport / Downtown Hub)</NativeSelectOption>
                        <NativeSelectOption value="country">Country Wide</NativeSelectOption>
                        <NativeSelectOption value="service_type">Service Type (Premium / Comfort)</NativeSelectOption>
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <Label htmlFor="pol-active" className="text-xs font-semibold cursor-pointer">
                        Enable Policy
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        When enabled, the matching engine uses this policy during ride dispatch
                      </p>
                    </div>
                    <Switch
                      id="pol-active"
                      checked={formData.isActive}
                      onCheckedChange={(val) => setFormData((p) => ({ ...p, isActive: val }))}
                    />
                  </div>
                </div>

                {/* 2. Broadcast Radius & Expansion */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    2. Search Radius & Expansion Waves
                  </span>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="init-rad" className="text-xs">Initial Radius (KM)</Label>
                      <Input
                        id="init-rad"
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={formData.initialRadiusKm}
                        onChange={(e) => setFormData((p) => ({ ...p, initialRadiusKm: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="max-rad" className="text-xs">Max Radius (KM)</Label>
                      <Input
                        id="max-rad"
                        type="number"
                        step="0.5"
                        min="1"
                        value={formData.maxRadiusKm}
                        onChange={(e) => setFormData((p) => ({ ...p, maxRadiusKm: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step-rad" className="text-xs">Radius Step (KM / Wave)</Label>
                      <Input
                        id="step-rad"
                        type="number"
                        step="0.5"
                        min="0.1"
                        value={formData.radiusStepKm}
                        onChange={(e) => setFormData((p) => ({ ...p, radiusStepKm: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary flex items-center gap-2">
                    <Radio className="h-4 w-4 shrink-0" />
                    <span>
                      Broadcast starts at <strong>{formData.initialRadiusKm || 1.5} km</strong>, and expands by <strong>+{formData.radiusStepKm || 2.0} km</strong> per wave up to a ceiling of <strong>{formData.maxRadiusKm || 15.0} km</strong>.
                    </span>
                  </div>
                </div>

                {/* 3. Driver Offer Timing & Wave Rules */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    3. Dispatch Timing & Candidate Limits
                  </span>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="offer-sec" className="text-xs">Offer Timeout (Sec)</Label>
                      <Input
                        id="offer-sec"
                        type="number"
                        min="5"
                        max="300"
                        value={formData.offerTimeoutSeconds}
                        onChange={(e) => setFormData((p) => ({ ...p, offerTimeoutSeconds: e.target.value }))}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground block">Countdown per driver</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="max-waves" className="text-xs">Max Waves</Label>
                      <Input
                        id="max-waves"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.maxWaves}
                        onChange={(e) => setFormData((p) => ({ ...p, maxWaves: e.target.value }))}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground block">Sequential search rounds</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="max-cand" className="text-xs">Candidates / Wave</Label>
                      <Input
                        id="max-cand"
                        type="number"
                        min="1"
                        max="50"
                        value={formData.maxCandidatesPerWave}
                        onChange={(e) => setFormData((p) => ({ ...p, maxCandidatesPerWave: e.target.value }))}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground block">Max drivers offered</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="max-eta" className="text-xs">Max Driver ETA (Min)</Label>
                      <Input
                        id="max-eta"
                        type="number"
                        min="5"
                        max="60"
                        value={formData.maxEtaMinutes}
                        onChange={(e) => setFormData((p) => ({ ...p, maxEtaMinutes: e.target.value }))}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground block">Cutoff threshold</span>
                    </div>
                  </div>
                </div>

                {/* 4. Smart Matching Weights */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      4. Driver Candidate Ranking Weights
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Higher score = higher priority in offer queue
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground block text-[11px]">ETA Proximity</span>
                      <span className="font-bold text-sm text-foreground">
                        {Math.round((formData.weights.etaWeight || 0.4) * 100)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground block text-[11px]">Distance</span>
                      <span className="font-bold text-sm text-foreground">
                        {Math.round((formData.weights.distanceWeight || 0.15) * 100)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground block text-[11px]">Driver Rating</span>
                      <span className="font-bold text-sm text-foreground">
                        {Math.round((formData.weights.ratingWeight || 0.1) * 100)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground block text-[11px]">Idle Time Fairness</span>
                      <span className="font-bold text-sm text-foreground">
                        {Math.round((formData.weights.idleWeight || 0.1) * 100)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground block text-[11px]">Acceptance Rate</span>
                      <span className="font-bold text-sm text-foreground">
                        {Math.round((formData.weights.acceptanceRateWeight || 0.1) * 100)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground block text-[11px]">Low Cancellation</span>
                      <span className="font-bold text-sm text-foreground">
                        {Math.round((formData.weights.cancellationRateWeight || 0.05) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  {isCreatingNew && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreatingNew(false)}
                      className="cursor-pointer text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={updatePoliciesMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer text-xs px-5 h-9"
                  >
                    {updatePoliciesMutation.isPending
                      ? "Saving..."
                      : isCreatingNew
                      ? "Create Dispatch Policy"
                      : "Save Policy Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Dispatch Queue Stream */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
              <CardTitle className="text-sm font-semibold">Live Active Dispatch Queue Stream</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Auto-refreshes every 5s</span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {activeJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Users className="h-9 w-9 stroke-1 mb-2 opacity-30" />
              <p className="text-sm font-medium">All dispatch queues are clear</p>
              <p className="text-xs opacity-60">No pending driver search waves right now</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeJobs.map((job, idx) => (
                <div
                  key={job.rideId || idx}
                  className="p-3 rounded-lg bg-accent/30 border border-border text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-foreground">
                      Ride #{job.rideId?.slice(0, 8)}...
                    </span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono text-[10px]">
                      {job.status || "SEARCHING"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Wave #{job.attempt}</span>
                    <span>{job.candidateDriverIds?.length || 0} candidate drivers</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
