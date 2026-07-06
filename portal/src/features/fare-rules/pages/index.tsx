import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/fullpage-loader";

interface FareRule {
  id: string;
  name: string;
  vehicleTypeId: string | null;
  zoneId: string | null;
  ruleType: string;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number[] | null;
  trafficDelayS: number | null;
  multiplier: string;
  priority: number;
  isActive: boolean;
}

interface VehicleType {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  name: string;
}

export default function FareRuleList() {
  const queryClient = useQueryClient();
  const [selectedRule, setSelectedRule] = useState<FareRule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    vehicleTypeId: "",
    zoneId: "",
    ruleType: "time",
    startTime: "",
    endTime: "",
    multiplier: "1.00",
    priority: 1,
    isActive: true,
  });

  // Fetch Fare Rules
  const { data: fareRules = [], isLoading: rulesLoading } = useQuery<FareRule[]>({
    queryKey: ["fare-rules"],
    queryFn: () => apiClient.get<FareRule[]>("/fare/rules").then(res => res.MESSAGE),
  });

  // Fetch Vehicle Types for select options
  const { data: vehicleTypes = [] } = useQuery<VehicleType[]>({
    queryKey: ["vehicle-types"],
    queryFn: () => apiClient.get<VehicleType[]>("/vehicle-types").then(res => res.MESSAGE),
  });

  // Fetch Zones for select options
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => apiClient.get<Zone[]>("/zones").then(res => res.MESSAGE),
  });

  // Save (Create/Update) mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (selectedRule) {
        return apiClient.patch(`/fare/rules/${selectedRule.id}`, payload);
      }
      return apiClient.post("/fare/rules", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fare-rules"] });
      toast.success(selectedRule ? "Fare rule updated!" : "Fare rule created!");
      setIsFormOpen(false);
      setSelectedRule(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save fare rule");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/fare/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fare-rules"] });
      toast.success("Fare rule deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete fare rule");
    },
  });

  if (rulesLoading) return <Loader />;

  const handleOpenCreate = () => {
    setSelectedRule(null);
    setFormData({
      name: "",
      vehicleTypeId: "",
      zoneId: "",
      ruleType: "time",
      startTime: "",
      endTime: "",
      multiplier: "1.00",
      priority: 1,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: FareRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      vehicleTypeId: rule.vehicleTypeId || "",
      zoneId: rule.zoneId || "",
      ruleType: rule.ruleType,
      startTime: rule.startTime || "",
      endTime: rule.endTime || "",
      multiplier: rule.multiplier,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this fare rule?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.multiplier) {
      toast.error("Name and multiplier value are required");
      return;
    }

    const payload: any = {
      name: formData.name,
      ruleType: formData.ruleType,
      multiplier: formData.multiplier,
      priority: formData.priority,
      isActive: formData.isActive,
      vehicleTypeId: formData.vehicleTypeId || null,
      zoneId: formData.zoneId || null,
    };

    if (formData.ruleType === "time") {
      payload.startTime = formData.startTime || null;
      payload.endTime = formData.endTime || null;
    }

    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Pricing / Surge Rules</h2>
          <p className="text-muted-foreground mt-1">Configure time-of-day surge rules, traffic multipliers, and region overrides.</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Surge Rule
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Pricing Adjustment Policies</CardTitle>
          <CardDescription>Rules executed dynamically at dispatch time to adjust rates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Rule Name</th>
                  <th className="px-6 py-4 font-semibold">Zone Filter</th>
                  <th className="px-6 py-4 font-semibold">Fleet Target</th>
                  <th className="px-6 py-4 font-semibold">Rule Context</th>
                  <th className="px-6 py-4 font-semibold">Multiplier</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fareRules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No surge / pricing rules registered.
                    </td>
                  </tr>
                ) : (
                  fareRules.map((rule) => {
                    const matchedVehicle = vehicleTypes.find(v => v.id === rule.vehicleTypeId);
                    const matchedZone = zones.find(z => z.id === rule.zoneId);
                    
                    return (
                      <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold">{rule.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">Type: {rule.ruleType}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {matchedZone ? matchedZone.name : "All Zones (Global)"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {matchedVehicle ? matchedVehicle.name : "All Vehicle Types"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {rule.ruleType === "time" && rule.startTime && rule.endTime
                            ? `${rule.startTime} to ${rule.endTime}`
                            : "Continuous"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-bold">{rule.multiplier}x</td>
                        <td className="px-6 py-4 text-muted-foreground">Lvl {rule.priority}</td>
                        <td className="px-6 py-4">
                          {rule.isActive ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-xs">
                              <CheckCircle className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground text-xs">
                              <XCircle className="h-3.5 w-3.5" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(rule)}
                            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
                            className="text-xs font-medium cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rule form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{selectedRule ? "Edit Surge Rule" : "Create Surge Rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Title / Description <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Night Surge Multiplier"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zoneId">Target Zone</Label>
                <select
                  id="zoneId"
                  value={formData.zoneId}
                  onChange={(e) => setFormData(prev => ({ ...prev, zoneId: e.target.value }))}
                  className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  <option value="">All Zones (Global)</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleTypeId">Target Vehicle Class</Label>
                <select
                  id="vehicleTypeId"
                  value={formData.vehicleTypeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleTypeId: e.target.value }))}
                  className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  <option value="">All Vehicles</option>
                  {vehicleTypes.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleType">Rule Classification</Label>
                <select
                  id="ruleType"
                  value={formData.ruleType}
                  onChange={(e) => setFormData(prev => ({ ...prev, ruleType: e.target.value }))}
                  className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  <option value="time">Time of Day</option>
                  <option value="traffic">Traffic Conditions</option>
                  <option value="zone">Zone surge</option>
                  <option value="demand">High Demand Surge</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Evaluation Priority Level</Label>
                <Input
                  id="priority"
                  type="number"
                  placeholder="1"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {formData.ruleType === "time" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time (HH:MM)</Label>
                  <Input
                    id="startTime"
                    placeholder="22:00"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (HH:MM)</Label>
                  <Input
                    id="endTime"
                    placeholder="05:00"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <Label htmlFor="multiplier">Adjustment Multiplier <span className="text-red-500">*</span></Label>
                <Input
                  id="multiplier"
                  placeholder="e.g. 1.50"
                  value={formData.multiplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, multiplier: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center gap-2 self-end h-10">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 accent-primary rounded border-border"
                />
                <Label htmlFor="isActive" className="cursor-pointer">Enable Surge Rule</Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white cursor-pointer" disabled={saveMutation.isPending}>
                Save Pricing Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
