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
  Car,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/fullpage-loader";

interface VehicleType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  capacity: number;
  baseRate: string;
  perKmRate: string;
  perMinRate: string;
  minFare: string;
  sortOrder: number;
  isActive: boolean;
}

export default function VehicleTypeList() {
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    capacity: 1,
    baseRate: "",
    perKmRate: "",
    perMinRate: "",
    minFare: "",
    sortOrder: 0,
    isActive: true,
  });

  // Fetch Vehicle Types
  const { data: vehicleTypes = [], isLoading } = useQuery<VehicleType[]>({
    queryKey: ["vehicle-types"],
    queryFn: () => apiClient.get<VehicleType[]>("/vehicle-types").then(res => res.MESSAGE),
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (payload: typeof formData) => {
      if (selectedVehicle) {
        return apiClient.patch(`/vehicle-types/${selectedVehicle.id}`, payload);
      }
      return apiClient.post("/vehicle-types", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-types"] });
      toast.success(selectedVehicle ? "Vehicle type updated!" : "Vehicle type created!");
      setIsFormOpen(false);
      setSelectedVehicle(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save vehicle type");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/vehicle-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-types"] });
      toast.success("Vehicle type deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete vehicle type");
    },
  });

  if (isLoading) return <Loader />;

  const handleOpenCreate = () => {
    setSelectedVehicle(null);
    setFormData({
      name: "",
      slug: "",
      capacity: 1,
      baseRate: "",
      perKmRate: "",
      perMinRate: "",
      minFare: "",
      sortOrder: 0,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (vt: VehicleType) => {
    setSelectedVehicle(vt);
    setFormData({
      name: vt.name,
      slug: vt.slug,
      capacity: vt.capacity,
      baseRate: vt.baseRate,
      perKmRate: vt.perKmRate,
      perMinRate: vt.perMinRate,
      minFare: vt.minFare,
      sortOrder: vt.sortOrder,
      isActive: vt.isActive,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this vehicle type?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.baseRate || !formData.perKmRate) {
      toast.error("Please fill in all required fields");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Vehicle Configurations</h2>
          <p className="text-muted-foreground mt-1">Configure parameters, base fares, and distance multipliers for dispatch classes.</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle Type
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Registered Fleet Types</CardTitle>
          <CardDescription>Setup values used by matching engines to calculate ride fares.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name / Slug</th>
                  <th className="px-6 py-4 font-semibold">Capacity</th>
                  <th className="px-6 py-4 font-semibold">Base Rate</th>
                  <th className="px-6 py-4 font-semibold">Per KM Rate</th>
                  <th className="px-6 py-4 font-semibold">Per Min Rate</th>
                  <th className="px-6 py-4 font-semibold">Min Fare</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicleTypes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No vehicle configurations found.
                    </td>
                  </tr>
                ) : (
                  vehicleTypes.map((vt) => (
                    <tr key={vt.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                          <Car className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{vt.name}</div>
                          <div className="text-xs text-muted-foreground">{vt.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{vt.capacity} Pax</td>
                      <td className="px-6 py-4 text-muted-foreground">₹{vt.baseRate}</td>
                      <td className="px-6 py-4 text-muted-foreground">₹{vt.perKmRate}/km</td>
                      <td className="px-6 py-4 text-muted-foreground">₹{vt.perMinRate}/min</td>
                      <td className="px-6 py-4 text-muted-foreground">₹{vt.minFare}</td>
                      <td className="px-6 py-4">
                        {vt.isActive ? (
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
                          onClick={() => handleOpenEdit(vt)}
                          className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(vt.id)}
                          className="text-xs font-medium cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{selectedVehicle ? "Update Fleet Parameters" : "Add Fleet Config"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Cab Prime"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug ID <span className="text-red-500">*</span></Label>
                <Input
                  id="slug"
                  placeholder="e.g. cab-prime"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (Pax)</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="4"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minFare">Minimum Fare (₹)</Label>
                <Input
                  id="minFare"
                  placeholder="e.g. 50.00"
                  value={formData.minFare}
                  onChange={(e) => setFormData(prev => ({ ...prev, minFare: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="baseRate">Base Rate <span className="text-red-500">*</span></Label>
                <Input
                  id="baseRate"
                  placeholder="30.00"
                  value={formData.baseRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseRate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perKmRate">Per KM Rate <span className="text-red-500">*</span></Label>
                <Input
                  id="perKmRate"
                  placeholder="12.00"
                  value={formData.perKmRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, perKmRate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perMinRate">Per Min Rate</Label>
                <Input
                  id="perMinRate"
                  placeholder="1.50"
                  value={formData.perMinRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, perMinRate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-2">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Priority Sort Order</Label>
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
                <Label htmlFor="isActive" className="cursor-pointer">Active dispatch class</Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white cursor-pointer" disabled={saveMutation.isPending}>
                Save Fleet Setup
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
