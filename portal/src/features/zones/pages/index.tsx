import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ZoneFormDialog } from "../dialog";
import ZoneList from "../list";

export default function ZoneListPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Zone Geofencing
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure geo-boundary locations, surge multiplier policies, and service zones.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm font-semibold cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Zone
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Configured Geofences</CardTitle>
          <CardDescription>
            Define zones to apply region-specific pricing and surge rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ZoneList />
        </CardContent>
      </Card>

      <ZoneFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        zone={null}
        onSuccess={() => {
          setIsCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ["zones"], refetchType: "active" });
        }}
      />
    </div>
  );
}