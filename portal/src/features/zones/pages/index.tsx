import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import ZoneList from "./list";

export default function ZonesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Operational Zones</h2>
        <p className="text-muted-foreground mt-1">
          Configure regional geofenced perimeters and dynamic multiplier rules.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Zone Control Management</CardTitle>
          <CardDescription>
            Filter structures or apply target rules across global operational boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ZoneList />
        </CardContent>
      </Card>
    </div>
  );
}
