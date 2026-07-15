import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Truck, FileText, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDriver } from "../hooks";


export default function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>();
  const { data, isLoading } = useDriver(driverId);
  const driver = data?.MESSAGE;

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading driver…</div>;
  }

  if (!driver) {
    return <div className="py-8 text-center text-muted-foreground">Driver not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild className="cursor-pointer">
          <Link to="/drivers">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Drivers
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {driver.name || "Unnamed Driver"}
        </h2>
        <p className="text-muted-foreground mt-1">{driver.phone}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </CardTitle>
            <CardDescription>Contact details on file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Phone</span>
              <span className="font-medium text-foreground">{driver.phone}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Email</span>
              <span className="font-medium text-foreground">{driver.email || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Date of Birth</span>
              <span className="font-medium text-foreground">{driver.dateOfBirth || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Gender</span>
              <span className="font-medium text-foreground">{driver.gender || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-primary" /> Vehicle Information
            </CardTitle>
            <CardDescription>Currently registered vehicle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Vehicle Number</span>
              <span className="font-medium text-foreground">{driver.vehicleNumber || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Make / Model</span>
              <span className="font-medium text-foreground">{driver.vehicleModel || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Year</span>
              <span className="font-medium text-foreground">{driver.vehicleYear || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Uploaded Documents
            </CardTitle>
            <CardDescription>License and identity proof.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">License Number</span>
              <span className="font-medium text-foreground">{driver.licenseNumber || "—"}</span>
              {driver.licenseDoc && (
                <a
                  href={driver.licenseDoc}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-primary text-xs font-semibold hover:underline mt-1"
                >
                  View License Copy
                </a>
              )}
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Aadhar Number</span>
              <span className="font-medium text-foreground">{driver.aadharNumber || "—"}</span>
              {driver.aadharDoc && (
                <a
                  href={driver.aadharDoc}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-primary text-xs font-semibold hover:underline mt-1"
                >
                  View Aadhar Document
                </a>
              )}
            </div>
            {driver.vehiclePhoto && (
              <div>
                <span className="text-xs text-muted-foreground block">Vehicle Photo</span>
                <a
                  href={driver.vehiclePhoto}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  View Vehicle Photo
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Registration Status
            </CardTitle>
            <CardDescription>Onboarding progress and approval decision.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Registration Status</span>
              <span className="font-medium text-foreground">{driver.registrationStatus}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Registration Step</span>
              <span className="font-medium text-foreground">{driver.registrationStep}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Approval Status</span>
              <span className="font-medium text-foreground capitalize">
                {driver.approvalStatus}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Approval Note</span>
              <span className="font-medium text-foreground">
                {driver.approvalNote || "No note recorded."}
              </span>
            </div>
            {driver.approvedAt && (
              <div>
                <span className="text-xs text-muted-foreground block">Decided At</span>
                <span className="font-medium text-foreground">
                  {new Date(driver.approvedAt).toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
