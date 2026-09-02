import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Truck,
  FileText,
  ShieldCheck,
  MapPin,
  Check,
  X,
  FilePlus2,
  ExternalLink,
  Edit,
  RotateCcw,
  Ban,
  Plus,
  Trash2,
  CheckCircle,
  Star,
  DollarSign,
  TrendingUp,
  Car,
  Landmark,
  Phone,
  Mail,
  Compass,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  ApproveDriverDialog,
  RejectDriverDialog,
  ResetToPendingDialog,
  RequestDocumentsDialog,
  EditDriverDialog,
  AddEditVehicleDialog,
} from "../components/dialog";
import { DriverSubscriptionPanel } from "../components/subscription-panel";
import { WalletPanel } from "@/features/wallets/components/wallet-panel";
import { BankDetailsPanel } from "@/features/bank-details/components/bank-details-panel";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import {
  useDriver,
  useDriverDocuments,
  useDocumentTypes,
  useVerifyDocument,
  useApproveDriver,
  useRejectDriver,
  useRequestDriverDocuments,
  useToggleBlockDriver,
  useAdminDeleteVehicle,
  useAdminActivateVehicle,
} from "../hooks";
import type { DriverDocument, DriverDocumentStatus, DriverVehicle } from "../types";

function formatDocCode(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const STATUS_STYLES: Record<DriverDocumentStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  approved: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  expired: "bg-muted text-muted-foreground border-border",
};

export default function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>();

  const { data, isLoading } = useDriver(driverId);
  const summary = data?.MESSAGE;
  const driver = summary?.driver;
  const vehicles = summary?.vehicles ?? [];
  const performance = (summary as any)?.performance;
  const trips = (summary as any)?.trips ?? [];
  const bankAccount = (summary as any)?.bankAccount;

  const { data: countriesData } = useCountryOptions();
  const { data: statesData } = useStateOptions(driver?.countryId || undefined);
  const { data: citiesData } = useCityOptions(driver?.stateId || undefined);
  const countryName = countriesData?.MESSAGE?.find((c) => c.id === driver?.countryId)?.name || driver?.countryName;
  const stateName = statesData?.MESSAGE?.find((s) => s.id === driver?.stateId)?.name || driver?.stateName;
  const cityName = citiesData?.MESSAGE?.find((c) => c.id === driver?.cityId)?.name || driver?.cityName;

  const { data: documentsData, isLoading: isLoadingDocuments } = useDriverDocuments(driverId);
  const documents = documentsData?.MESSAGE ?? [];

  const { data: docTypesData } = useDocumentTypes();
  const docTypeCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    docTypesData?.MESSAGE?.forEach((t) => map.set(t.id, t.code));
    return map;
  }, [docTypesData]);

  const verifyMutation = useVerifyDocument(driverId);
  const approveMutation = useApproveDriver();
  const rejectMutation = useRejectDriver();
  const requestDocsMutation = useRequestDriverDocuments();
  const toggleBlockMutation = useToggleBlockDriver();
  const deleteVehicleMutation = useAdminDeleteVehicle(driverId);
  const activateVehicleMutation = useAdminActivateVehicle(driverId);

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isResetPendingOpen, setIsResetPendingOpen] = useState(false);
  const [isRequestDocsOpen, setIsRequestDocsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<DriverVehicle | null>(null);

  const [approvalNote, setApprovalNote] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [requestDocCodes, setRequestDocCodes] = useState("");
  const [requestDocNote, setRequestDocNote] = useState("");

  const [rejectingDoc, setRejectingDoc] = useState<DriverDocument | null>(null);
  const [documentRejectionReason, setDocumentRejectionReason] = useState("");

  if (isLoading) {
    return <div className="py-16 text-center text-muted-foreground">Loading driver profile…</div>;
  }

  if (!driver || !driverId) {
    return <div className="py-16 text-center text-muted-foreground">Driver record not found.</div>;
  }

  const activeVehicle = vehicles.find((v) => v.isActive) || vehicles[0];

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveMutation.mutate(
      { id: driverId, note: approvalNote || undefined },
      { onSuccess: () => { setIsApproveOpen(false); setApprovalNote(""); } },
    );
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionNote.trim()) return;
    rejectMutation.mutate(
      { id: driverId, note: rejectionNote },
      { onSuccess: () => { setIsRejectOpen(false); setRejectionNote(""); } },
    );
  };

  const handleRequestDocsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const documentTypeCodes = requestDocCodes
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);
    if (documentTypeCodes.length === 0) return;
    requestDocsMutation.mutate(
      { id: driverId, documentTypeCodes, note: requestDocNote || undefined },
      {
        onSuccess: () => {
          setIsRequestDocsOpen(false);
          setRequestDocCodes("");
          setRequestDocNote("");
        },
      },
    );
  };

  const handleApproveDocument = (doc: DriverDocument) => {
    verifyMutation.mutate({ docId: doc.id, payload: { approve: true } });
  };

  const handleOpenRejectDocument = (doc: DriverDocument) => {
    setRejectingDoc(doc);
    setDocumentRejectionReason("");
  };

  const handleRejectDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDoc || !documentRejectionReason.trim()) return;
    verifyMutation.mutate(
      { docId: rejectingDoc.id, payload: { approve: false, rejectionReason: documentRejectionReason } },
      { onSuccess: () => setRejectingDoc(null) },
    );
  };

  const handleToggleBlock = () => {
    toggleBlockMutation.mutate({ id: driver.id, isBlocked: driver.isBlocked });
  };

  const handleActivateVehicle = (vehicleId: string) => {
    activateVehicleMutation.mutate(vehicleId);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm("Are you sure you want to remove this vehicle?")) {
      deleteVehicleMutation.mutate(vehicleId);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Quick Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <Link to="/drivers">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Drivers
            </Link>
          </Button>
        </div>

        {/* Top Status & Transition Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="cursor-pointer"
          >
            <Edit className="h-4 w-4 mr-1.5 text-primary" />
            Edit Profile
          </Button>

          <Button
            variant={driver.isBlocked ? "outline" : "destructive"}
            size="sm"
            onClick={handleToggleBlock}
            disabled={toggleBlockMutation.isPending}
            className="cursor-pointer"
          >
            <Ban className="h-4 w-4 mr-1.5" />
            {driver.isBlocked ? "Unblock Driver" : "Suspend / Block"}
          </Button>

          {driver.approvalStatus === "rejected" && (
            <>
              <Button
                size="sm"
                onClick={() => setIsResetPendingOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Change to Pending
              </Button>
              <Button
                size="sm"
                onClick={() => setIsApproveOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Approve Driver
              </Button>
            </>
          )}

          {driver.approvalStatus === "approved" && (
            <>
              <Button
                size="sm"
                onClick={() => setIsResetPendingOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Change to Pending
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRejectOpen(true)}
                className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
              >
                <X className="h-4 w-4 mr-1.5" />
                Reject Application
              </Button>
            </>
          )}

          {driver.approvalStatus === "pending" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRejectOpen(true)}
                className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
              >
                <X className="h-4 w-4 mr-1.5" />
                Reject Application
              </Button>
              <Button
                size="sm"
                onClick={() => setIsApproveOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Approve Partner
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero Header Section (Inspired by Stitch Driver Profile) */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-center md:items-start justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Avatar with live status ring */}
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-primary/40 bg-muted/40 flex items-center justify-center text-primary font-bold text-3xl shrink-0 shadow-inner">
              {driver.profilePhoto ? (
                <img
                  src={driver.profilePhoto}
                  alt={driver.name || "Driver"}
                  className="w-full h-full object-cover"
                />
              ) : (
                driver.name ? driver.name.charAt(0).toUpperCase() : "D"
              )}
            </div>
            {driver.isOnline && (
              <span
                className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-card ring-2 ring-green-500/30"
                title="Online & Receiving Dispatches"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {driver.name || "Unnamed Driver"}
              </h1>
              <Badge variant="outline" className="font-mono text-xs font-semibold uppercase">
                ID: #DRV-{driver.id.slice(0, 8).toUpperCase()}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-primary" /> {driver.phone}
              </span>
              {driver.email && (
                <span className="flex items-center gap-1">
                  • <Mail className="h-3 w-3 text-primary" /> {driver.email}
                </span>
              )}
              {(cityName || countryName) && (
                <span className="flex items-center gap-1">
                  • <MapPin className="h-3 w-3 text-primary" /> {[cityName, stateName, countryName].filter(Boolean).join(", ")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {driver.isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Active - Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Offline
                </span>
              )}

              <span
                className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  driver.approvalStatus === "approved"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                    : driver.approvalStatus === "rejected"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                Approval: {driver.approvalStatus}
              </span>

              {driver.isBlocked && (
                <Badge variant="destructive" className="text-xs uppercase">
                  Account Suspended
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {driver.registrationStatus !== "approved" && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs cursor-pointer gap-1.5 border-primary/40 text-primary hover:bg-primary/5 font-semibold"
            >
              <Link to={`/drivers/register?driverId=${driver.id}`}>
                <FileText className="h-3.5 w-3.5" />
                Resume Registration
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRequestDocsOpen(true)}
            className="text-xs cursor-pointer gap-1.5"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Request Docs
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingVehicle(null);
              setIsAddVehicleOpen(true);
            }}
            className="text-xs cursor-pointer gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* 4 Bento Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Bento 1: Personal & Demographic Info */}
        <Card className="border-border bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-primary" /> Personal Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="font-medium text-foreground">{driver.dateOfBirth || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Gender</span>
              <span className="font-medium text-foreground capitalize">{driver.gender || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Preferred Lang</span>
              <span className="font-medium text-foreground uppercase">{driver.preferredLanguageCode || "EN"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Joined Platform</span>
              <span className="font-medium text-foreground">
                {driver.createdAt ? formatDate(driver.createdAt) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Bento 2: Active Vehicle Details & Photo */}
        <Card className="border-border bg-card shadow-sm flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Car className="h-4 w-4 text-primary" /> Primary Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {activeVehicle ? (
              <>
                {/* Vehicle photo preview with badge overlay */}
                <div className="relative rounded-lg overflow-hidden h-24 bg-muted/40 border border-border flex items-center justify-center">
                  {activeVehicle.image ? (
                    <img
                      src={activeVehicle.image}
                      alt={activeVehicle.model}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Car className="h-8 w-8 text-primary/40" />
                      <span className="text-[10px]">No photo uploaded</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white rounded text-[10px] font-semibold">
                    {activeVehicle.color || "Standard"} • {activeVehicle.year}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground text-sm">
                    {activeVehicle.brand ? `${activeVehicle.brand} ` : ""}{activeVehicle.model}
                  </span>
                  <span className="font-mono text-[11px] font-bold bg-muted px-2 py-0.5 rounded border border-border">
                    {activeVehicle.registrationNumber}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Seats: {activeVehicle.seats || 4}</span>
                  <span className="capitalize">{activeVehicle.fuelType || "Petrol"} • {activeVehicle.transmission || "Auto"}</span>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                <p>No vehicle assigned yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bento 3: Performance & Telemetry */}
        <Card className="border-border bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> Performance & Trips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Driver Rating</span>
              <span className="font-semibold text-foreground flex items-center gap-1 text-amber-500">
                <Star className="h-3 w-3 fill-amber-500" />
                {performance?.rating || driver.rating || "5.0"} ({driver.totalRatings || 0} reviews)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Completed Rides</span>
              <span className="font-semibold text-foreground">{performance?.completedTrips ?? driver.totalRides} trips</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {performance?.completionRate ?? 100}%
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Acceptance Rate</span>
              <span className="font-semibold text-primary">
                {performance?.acceptanceRate ?? 98}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Bento 4: Compliance & Banking */}
        <Card className="border-border bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Compliance & Banking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">License Doc</span>
              <span className="font-semibold text-foreground">
                {driver.licenseNumber ? "Provided ✅" : "Pending ⚠️"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">National ID / Aadhar</span>
              <span className="font-semibold text-foreground">
                {driver.aadharNumber ? "Verified ✅" : "Pending ⚠️"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Payout Bank Account</span>
              <span className="font-semibold text-foreground">
                {bankAccount ? `${bankAccount.bankName} (••••${bankAccount.accountNumber?.slice(-4)})` : "Not Configured"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Subscription Plan</span>
              <span className="font-semibold text-primary capitalize">
                {driver.subscriptionStatus || "Standard"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Details Section */}
      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList className="grid grid-cols-5 w-full bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="vehicles" className="text-xs sm:text-sm font-medium">
            <Truck className="h-3.5 w-3.5 mr-1.5" />
            Vehicles ({vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm font-medium">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="trips" className="text-xs sm:text-sm font-medium">
            <Compass className="h-3.5 w-3.5 mr-1.5" />
            Trips Log ({trips.length})
          </TabsTrigger>
          <TabsTrigger value="banking" className="text-xs sm:text-sm font-medium">
            <Landmark className="h-3.5 w-3.5 mr-1.5" />
            Bank & Payouts
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs sm:text-sm font-medium">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Wallet & Plans
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Vehicles */}
        <TabsContent value="vehicles" className="mt-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Registered Driver Vehicles</CardTitle>
                <CardDescription>All vehicles linked to this driver with direct photo and status controls.</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingVehicle(null);
                  setIsAddVehicleOpen(true);
                }}
                className="text-xs cursor-pointer gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Add Vehicle
              </Button>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl">
                  <Car className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No vehicles registered yet for this driver.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingVehicle(null);
                      setIsAddVehicleOpen(true);
                    }}
                    className="mt-3 cursor-pointer text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Driver's First Vehicle
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`border rounded-xl p-4 space-y-3 text-xs transition-all ${
                        vehicle.isActive
                          ? "border-primary/50 bg-primary/5 shadow-xs"
                          : "border-border bg-card"
                      }`}
                    >
                      {/* Vehicle photo */}
                      <div className="relative rounded-lg overflow-hidden h-36 bg-muted/40 border border-border flex items-center justify-center">
                        {vehicle.image ? (
                          <img
                            src={vehicle.image}
                            alt={vehicle.model}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Car className="h-10 w-10 text-muted-foreground/30" />
                        )}
                        <span
                          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                            vehicle.isActive
                              ? "bg-green-600 text-white"
                              : "bg-black/60 text-white backdrop-blur-xs"
                          }`}
                        >
                          {vehicle.isActive ? "Active Primary" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-foreground text-sm">
                            {vehicle.brand ? `${vehicle.brand} ` : ""}{vehicle.model}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            {vehicle.color || "Standard Color"} • Year {vehicle.year}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded border border-border">
                          {vehicle.registrationNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-muted-foreground pt-1 border-t border-border/50">
                        <span>Seats: {vehicle.seats || 4}</span>
                        <span>• Fuel: {vehicle.fuelType || "Petrol"}</span>
                        {vehicle.transmission && <span>• {vehicle.transmission}</span>}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        {!vehicle.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateVehicle(vehicle.id)}
                            disabled={activateVehicleMutation.isPending}
                            className="h-7 text-xs cursor-pointer text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950/20"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Set Active
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingVehicle(vehicle);
                            setIsAddVehicleOpen(true);
                          }}
                          className="h-7 text-xs cursor-pointer"
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          disabled={deleteVehicleMutation.isPending}
                          className="h-7 text-xs cursor-pointer text-red-600 border-red-600/30 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Verification Documents</CardTitle>
                <CardDescription>Verify legal identification, licenses, and permits with one-click administrative review.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRequestDocsOpen(true)}
                className="text-xs cursor-pointer gap-1.5"
              >
                <FilePlus2 className="h-3.5 w-3.5" /> Request Documents
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading documents…</p>
              ) : documents.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p>No documents uploaded yet for this driver.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-border rounded-xl p-4 flex flex-wrap items-start justify-between gap-3 bg-card"
                    >
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {formatDocCode(docTypeCodeMap.get(doc.documentTypeId) || "Document")}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[doc.status]}`}
                          >
                            {doc.status}
                          </span>
                        </div>
                        {doc.documentNumber && (
                          <div className="text-muted-foreground">Document #: {doc.documentNumber}</div>
                        )}
                        {doc.expiryDate && (
                          <div className="text-muted-foreground">
                            Expires: {formatDate(doc.expiryDate)}
                          </div>
                        )}
                        {doc.status === "rejected" && doc.rejectionReason && (
                          <div className="text-red-600 dark:text-red-400 font-medium">
                            Rejection Reason: {doc.rejectionReason}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 pt-1">
                          {doc.frontViewUrl && (
                            <a
                              href={doc.frontViewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-semibold hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View Front
                            </a>
                          )}
                          {doc.backViewUrl && (
                            <a
                              href={doc.backViewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-semibold hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View Back
                            </a>
                          )}
                          {doc.pdfViewUrl && (
                            <a
                              href={doc.pdfViewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-semibold hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View PDF
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Document Action Controls */}
                      <div className="flex items-center gap-2">
                        {doc.status !== "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveDocument(doc)}
                            disabled={verifyMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        )}
                        {doc.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRejectDocument(doc)}
                            disabled={verifyMutation.isPending}
                            className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs h-8 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Trips Activity Log */}
        <TabsContent value="trips" className="mt-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Driver Ride Activity</CardTitle>
              <CardDescription>Recent rides serviced by this driver with telemetry & fares.</CardDescription>
            </CardHeader>
            <CardContent>
              {trips.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  <Compass className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p>No rides logged yet for this driver.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-border text-muted-foreground bg-muted/20 uppercase font-semibold">
                      <tr>
                        <th className="p-3">Ride ID</th>
                        <th className="p-3">Pickup Address</th>
                        <th className="p-3">Drop Address</th>
                        <th className="p-3">Fare</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {trips.map((ride: any) => (
                        <tr key={ride.id} className="hover:bg-muted/10">
                          <td className="p-3 font-mono font-semibold text-foreground">
                            #{ride.id.slice(0, 8)}
                          </td>
                          <td className="p-3 max-w-[200px] truncate text-foreground">
                            {ride.pickupAddress || "N/A"}
                          </td>
                          <td className="p-3 max-w-[200px] truncate text-foreground">
                            {ride.dropAddress || "N/A"}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {ride.finalFareMinor ? `${ride.currencyCode || "$"} ${(ride.finalFareMinor / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="p-3">
                            <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted border border-border">
                              {ride.status}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {ride.requestedAt ? formatDateTime(ride.requestedAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Banking & Payouts */}
        <TabsContent value="banking" className="mt-4">
          {driverId && <BankDetailsPanel ownerType="driver" ownerId={driverId} />}
        </TabsContent>

        {/* Tab 5: Subscriptions & Wallets */}
        <TabsContent value="subscriptions" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driverId && <WalletPanel ownerType="driver" ownerId={driverId} />}
            {driverId && (
              <DriverSubscriptionPanel
                driverId={driverId}
                countryId={driver?.countryId || undefined}
                driverName={driver?.name || undefined}
                driverEmail={driver?.email || undefined}
                driverPhone={driver?.phone || undefined}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Rejection Document Dialog */}
      {rejectingDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Reject Document</h3>
            <p className="text-xs text-muted-foreground">
              Please provide a clear reason for rejecting this document so the driver can upload a valid replacement.
            </p>
            <form onSubmit={handleRejectDocumentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5">Reason for Rejection *</label>
                <textarea
                  required
                  rows={3}
                  value={documentRejectionReason}
                  onChange={(e) => setDocumentRejectionReason(e.target.value)}
                  placeholder="e.g. Image blurry / expired license / registration number mismatch"
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingDoc(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={verifyMutation.isPending}
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Action Modals */}
      <ApproveDriverDialog
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        note={approvalNote}
        setNote={setApprovalNote}
        onSubmit={handleApproveSubmit}
        isPending={approveMutation.isPending}
      />

      <RejectDriverDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        note={rejectionNote}
        setNote={setRejectionNote}
        onSubmit={handleRejectSubmit}
        isPending={rejectMutation.isPending}
      />

      <ResetToPendingDialog
        open={isResetPendingOpen}
        onOpenChange={setIsResetPendingOpen}
        driverId={driverId}
      />

      <RequestDocumentsDialog
        open={isRequestDocsOpen}
        onOpenChange={setIsRequestDocsOpen}
        documentTypeCodes={requestDocCodes}
        setDocumentTypeCodes={setRequestDocCodes}
        note={requestDocNote}
        setNote={setRequestDocNote}
        onSubmit={handleRequestDocsSubmit}
        isPending={requestDocsMutation.isPending}
      />

      <EditDriverDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        driver={driver}
      />

      <AddEditVehicleDialog
        open={isAddVehicleOpen}
        onOpenChange={setIsAddVehicleOpen}
        driverId={driverId}
        vehicle={editingVehicle}
      />
    </div>
  );
}
