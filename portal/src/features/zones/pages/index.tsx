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
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit2,
  Trash2,
  Map,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/fullpage-loader";

interface Zone {
  id: string;
  name: string;
  type: string;
  polygon: {
    type: string;
    coordinates: number[][][];
  };
  multiplier: string;
  description: string | null;
  isActive: boolean;
}

export default function ZoneList() {
  const queryClient = useQueryClient();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "city",
    coordinatesText: "[[[88.34, 22.56], [88.39, 22.56], [88.39, 22.59], [88.34, 22.59], [88.34, 22.56]]]",
    multiplier: "1.00",
    description: "",
    isActive: true,
  });

  // Fetch Zones
  const { data: zones = [], isLoading } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: () => apiClient.get<Zone[]>("/zones").then(res => res.MESSAGE),
  });

  // Save (Create/Update) mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (selectedZone) {
        return apiClient.patch(`/zones/${selectedZone.id}`, payload);
      }
      return apiClient.post("/zones", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast.success(selectedZone ? "Zone geofence updated!" : "Zone geofence created!");
      setIsFormOpen(false);
      setSelectedZone(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save zone");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast.success("Zone geofence deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete zone");
    },
  });

  if (isLoading) return <Loader />;

  const handleOpenCreate = () => {
    setSelectedZone(null);
    setFormData({
      name: "",
      type: "city",
      coordinatesText: "[[[88.34, 22.56], [88.39, 22.56], [88.39, 22.59], [88.34, 22.59], [88.34, 22.56]]]",
      multiplier: "1.00",
      description: "",
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (zone: Zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      type: zone.type,
      coordinatesText: JSON.stringify(zone.polygon.coordinates),
      multiplier: zone.multiplier,
      description: zone.description || "",
      isActive: zone.isActive,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this zone geofence?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.coordinatesText) {
      toast.error("Name and Polygon coordinates are required");
      return;
    }

    try {
      const parsedCoords = JSON.parse(formData.coordinatesText);
      if (!Array.isArray(parsedCoords) || parsedCoords.length === 0) {
        throw new Error("Coordinates must be a valid GeoJSON 3D array [[[lng, lat], ...]]");
      }
      
      const payload = {
        name: formData.name,
        type: formData.type,
        polygon: {
          type: "Polygon",
          coordinates: parsedCoords,
        },
        multiplier: formData.multiplier,
        description: formData.description,
        isActive: formData.isActive,
      };

      saveMutation.mutate(payload);
    } catch (err: any) {
      toast.error(`Invalid coordinates format: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Zone Geofencing</h2>
          <p className="text-muted-foreground mt-1">Configure geo-boundary locations, surge multiplier policies, and service zones.</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Zone
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Configured Geofences</CardTitle>
          <CardDescription>Define zones to apply region-specific pricing and surge rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Zone Details</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Surge Multiplier</th>
                  <th className="px-6 py-4 font-semibold">Coordinates Count</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {zones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No geofence zones configured.
                    </td>
                  </tr>
                ) : (
                  zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                          <Map className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{zone.name}</div>
                          <div className="text-xs text-muted-foreground">{zone.description || "No description"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize text-muted-foreground">{zone.type}</td>
                      <td className="px-6 py-4 text-muted-foreground font-semibold">{zone.multiplier}x</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {zone.polygon?.coordinates?.[0]?.length || 0} nodes
                      </td>
                      <td className="px-6 py-4">
                        {zone.isActive ? (
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
                          onClick={() => handleOpenEdit(zone)}
                          className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(zone.id)}
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

      {/* Geofence Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{selectedZone ? "Modify Geofence Parameters" : "Create Geofence Zone"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Airport Zone"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Zone Category</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  <option value="city">City Core</option>
                  <option value="large_city">Large City Area</option>
                  <option value="suburb">Suburb Boundary</option>
                  <option value="airport">Airport Hub</option>
                  <option value="highway">Highway Segment</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Remarks / Description</Label>
              <Input
                id="description"
                placeholder="Description of geographic boundaries"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <Label htmlFor="multiplier">Surge Multiplier</Label>
                <Input
                  id="multiplier"
                  placeholder="e.g. 1.25"
                  value={formData.multiplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, multiplier: e.target.value }))}
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
                <Label htmlFor="isActive" className="cursor-pointer">Enable Service in Zone</Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="polygon" className="flex items-center gap-1.5">
                  Polygon GPS Coordinates (JSON Matrix) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <HelpCircle className="h-3 w-3" /> Array of [[[lng, lat], ...]]
                </span>
              </div>
              <Textarea
                id="polygon"
                rows={4}
                className="font-mono text-xs"
                placeholder="[[[88.34, 22.56], [88.39, 22.56], [88.39, 22.59], [88.34, 22.59], [88.34, 22.56]]]"
                value={formData.coordinatesText}
                onChange={(e) => setFormData(prev => ({ ...prev, coordinatesText: e.target.value }))}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white cursor-pointer" disabled={saveMutation.isPending}>
                Save Boundary Setup
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
