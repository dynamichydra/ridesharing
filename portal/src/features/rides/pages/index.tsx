import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import RideList from "./list";

export default function RideListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Rides Management</h2>
        <p className="text-muted-foreground mt-1">
          Monitor active dispatches, routing details, and status update histories.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Dispatched Rides</CardTitle>
          <CardDescription>Grid overview of all ride transactions and telemetry logs.</CardDescription>
        </CardHeader>
        <CardContent>
          <RideList />
        </CardContent>
      </Card>
    </div>
  );
}
