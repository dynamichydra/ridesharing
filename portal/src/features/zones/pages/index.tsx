import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/fullpage-loader";
import { useCreateZone, useDeleteZone, useUpdateZone, useZones } from "../hooks";
import { getZoneColumns } from "../column";
import { ZoneFormDialog, ZoneDeleteDialog } from "../dialog";
import  { emptyZoneFormValues, type ZoneFormValues } from "../schema";
import type { Zone } from "../types";

export default function ZoneList() {
  const [page, setPage] = useState(1);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [zonePendingDelete, setZonePendingDelete] = useState<Zone | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data, isLoading } = useZones({ page, limit: 10 });
  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const deleteMutation = useDeleteZone();

  const handleOpenCreate = () => {
    setSelectedZone(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (zone: Zone) => {
    setSelectedZone(zone);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (zone: Zone) => {
    setZonePendingDelete(zone);
    setIsDeleteOpen(true);
  };

  const getDefaultValues = (): ZoneFormValues => {
    if (!selectedZone) return emptyZoneFormValues;
    return {
      name: selectedZone.name,
      type: selectedZone.type,
      coordinatesText: JSON.stringify(selectedZone.polygon.coordinates),
      multiplier: selectedZone.multiplier,
      description: selectedZone.description || "",
      isActive: selectedZone.isActive,
    };
  };

  const handleSubmit = (values: ZoneFormValues) => {
    let parsedCoords: number[][][];
    try {
      parsedCoords = JSON.parse(values.coordinatesText);
      if (!Array.isArray(parsedCoords) || parsedCoords.length === 0) {
        throw new Error("Coordinates must be a valid GeoJSON 3D array [[[lng, lat], ...]]");
      }
    } catch (err: any) {
      toast.error(`Invalid coordinates format: ${err.message}`);
      return;
    }

    const payload = {
      name: values.name,
      type: values.type,
      polygon: {
        type: "Polygon",
        coordinates: parsedCoords,
      },
      multiplier: values.multiplier,
      description: values.description,
      isActive: values.isActive,
    };

    if (selectedZone) {
      updateMutation.mutate(
        { id: selectedZone.id, payload },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setSelectedZone(null);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!zonePendingDelete) return;
    deleteMutation.mutate(zonePendingDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setZonePendingDelete(null);
      },
    });
  };

  if (isLoading) return <Loader />;

  const zones = data?.data ?? [];
  const pagination = data?.pagination;
  const columns = getZoneColumns({ onEdit: handleOpenEdit, onDelete: handleOpenDelete });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Zone Geofencing</h2>
          <p className="text-muted-foreground mt-1">
            Configure geo-boundary locations, surge multiplier policies, and service zones.
          </p>
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
        <CardContent className="space-y-4">
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={`px-6 py-4 font-semibold ${col.className ?? ""}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {zones.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                      No geofence zones configured.
                    </td>
                  </tr>
                ) : (
                  zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-6 py-4">
                          {col.render(zone)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Showing Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ZoneFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedZone(null);
        }}
        selectedZone={selectedZone}
        defaultValues={getDefaultValues()}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ZoneDeleteDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setZonePendingDelete(null);
        }}
        zone={zonePendingDelete}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}