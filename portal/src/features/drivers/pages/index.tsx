import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import DriverList from "./list";

export default function DriverListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Drivers Directory
        </h2>
        <p className="text-muted-foreground mt-1">
          Approve onboarding applications, review license/aadhar uploads, and manage block
          lists.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Drivers Registry</CardTitle>
          <CardDescription>Onboarded and applying partners on the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DriverList />
        </CardContent>
      </Card>
    </div>
  );
}
