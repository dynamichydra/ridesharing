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
  CheckCircle,
  XCircle,
  CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/fullpage-loader";

interface SubscriptionPlan {
  id: string;
  name: string;
  type: string;
  price: string;
  durationDays: number | null;
  trialDays: number;
  features: string[] | null;
  vehicleTypeIds: string[] | null;
  maxRidesPerDay: number | null;
  sortOrder: number;
  isActive: boolean;
  razorpayPlanId: string | null;
}

interface VehicleType {
  id: string;
  name: string;
}

export default function SubscriptionPlanList() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "monthly",
    price: "",
    durationDays: "30",
    trialDays: "0",
    maxRidesPerDay: "",
    sortOrder: 0,
    isActive: true,
    razorpayPlanId: "",
  });

  // Fetch Subscription Plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: () => apiClient.get<SubscriptionPlan[]>("/subscriptions/plans/all").then(res => res.MESSAGE),
  });

  // Fetch Vehicle Types
  const { data: vehicleTypes = [] } = useQuery<VehicleType[]>({
    queryKey: ["vehicle-types"],
    queryFn: () => apiClient.get<VehicleType[]>("/vehicle-types").then(res => res.MESSAGE),
  });

  // Save (Create/Update) mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (selectedPlan) {
        return apiClient.patch(`/subscriptions/plans/${selectedPlan.id}`, payload);
      }
      return apiClient.post("/subscriptions/plans", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success(selectedPlan ? "Subscription plan updated!" : "Subscription plan created!");
      setIsFormOpen(false);
      setSelectedPlan(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save plan");
    },
  });

  if (plansLoading) return <Loader />;

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setFormData({
      name: "",
      type: "monthly",
      price: "",
      durationDays: "30",
      trialDays: "0",
      maxRidesPerDay: "",
      sortOrder: 0,
      isActive: true,
      razorpayPlanId: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      type: plan.type,
      price: plan.price,
      durationDays: plan.durationDays?.toString() || "",
      trialDays: plan.trialDays.toString(),
      maxRidesPerDay: plan.maxRidesPerDay?.toString() || "",
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
      razorpayPlanId: plan.razorpayPlanId || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      price: formData.price,
      durationDays: formData.durationDays ? parseInt(formData.durationDays) : null,
      trialDays: parseInt(formData.trialDays) || 0,
      maxRidesPerDay: formData.maxRidesPerDay ? parseInt(formData.maxRidesPerDay) : null,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
      razorpayPlanId: formData.razorpayPlanId || null,
      features: selectedPlan?.features || ["Unlimited matches", "Customer support access"],
      vehicleTypeIds: selectedPlan?.vehicleTypeIds || vehicleTypes.map(v => v.id),
    };

    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Driver Subscriptions</h2>
          <p className="text-muted-foreground mt-1">Configure subscription packages, prices, and limits allowed for partner accounts.</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Driver Onboarding Plans</CardTitle>
          <CardDescription>Configure packages driver partners must buy to match passenger dispatches.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Plan Name</th>
                  <th className="px-6 py-4 font-semibold">Interval Type</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Validity</th>
                  <th className="px-6 py-4 font-semibold">Max Daily Rides</th>
                  <th className="px-6 py-4 font-semibold">Razorpay Plan ID</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No subscription plans found.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{plan.name}</div>
                          <div className="text-xs text-muted-foreground">Order priority: {plan.sortOrder}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize text-muted-foreground">{plan.type}</td>
                      <td className="px-6 py-4 text-muted-foreground font-semibold">₹{plan.price}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {plan.durationDays ? `${plan.durationDays} Days` : "Lifetime"}
                        {plan.trialDays > 0 ? ` (+${plan.trialDays}d Trial)` : ""}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {plan.maxRidesPerDay ? `${plan.maxRidesPerDay} rides/day` : "Unlimited"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                        {plan.razorpayPlanId || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {plan.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-xs">
                            <CheckCircle className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <XCircle className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(plan)}
                          className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plan form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{selectedPlan ? "Update Subscription Package" : "Create Onboarding Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Title <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Premium Monthly"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Plan Interval</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="custom">Custom days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) <span className="text-red-500">*</span></Label>
                <Input
                  id="price"
                  placeholder="e.g. 299.00"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationDays">Duration (Days)</Label>
                <Input
                  id="durationDays"
                  placeholder="e.g. 30"
                  value={formData.durationDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationDays: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trialDays">Trial Validity (Days)</Label>
                <Input
                  id="trialDays"
                  placeholder="0"
                  value={formData.trialDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, trialDays: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRides">Max Daily Rides Limit</Label>
                <Input
                  id="maxRides"
                  placeholder="Unlimited"
                  value={formData.maxRidesPerDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxRidesPerDay: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="razorpayPlanId">Razorpay Plan ID (Optional)</Label>
              <Input
                id="razorpayPlanId"
                placeholder="plan_xxxxxxxxxxxxxx"
                value={formData.razorpayPlanId}
                onChange={(e) => setFormData(prev => ({ ...prev, razorpayPlanId: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-2">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Priority Listing Rank</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
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
                <Label htmlFor="isActive" className="cursor-pointer">Enable Plan Purchase</Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white cursor-pointer" disabled={saveMutation.isPending}>
                Save Onboarding Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
