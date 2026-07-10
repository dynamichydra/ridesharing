import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import VehicleTypeList from "../list";

export default function VehicleTypeListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Vehicle Configurations
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure parameters, base fares, and distance multipliers for dispatch classes.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Registered Fleet Types</CardTitle>
          <CardDescription>
            Setup values used by matching engines to calculate ride fares.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleTypeList />
        </CardContent>
      </Card>
    </div>
  );
}