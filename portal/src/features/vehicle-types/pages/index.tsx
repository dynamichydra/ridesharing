import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import VehicleTypeList from "./list";

export default function VehicleTypeListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Vehicle Configurations
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage the global vehicle type catalog used across matching and dispatch.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Registered Fleet Types</CardTitle>
          <CardDescription>
            Vehicle classes available across the platform. Per-country pricing is configured separately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleTypeList />
        </CardContent>
      </Card>
    </div>
  );
}
