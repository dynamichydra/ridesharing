import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import ZoneList from "./list";

export default function ZoneListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Zone Geofencing
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure geo-boundary locations, surge multiplier policies, and service zones.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Configured Geofences</CardTitle>
          <CardDescription>
            Define zones to apply region-specific pricing and surge rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ZoneList />
        </CardContent>
      </Card>
    </div>
  );
}