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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ApproveDriverDialog,
  RejectDriverDialog,
  ResetToPendingDialog,
  RequestDocumentsDialog,
  RejectDocumentDialog,
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
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400",
};

export default function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>();

  const { data, isLoading } = useDriver(driverId);
  const summary = data?.MESSAGE;
  const driver = summary?.driver;
  const vehicles = summary?.vehicles ?? [];

  const { data: countriesData } = useCountryOptions();
  const { data: statesData } = useStateOptions(driver?.countryId || undefined);
  const { data: citiesData } = useCityOptions(driver?.stateId || undefined);
  const countryName = countriesData?.MESSAGE?.find((c) => c.id === driver?.countryId)?.name;
  const stateName = statesData?.MESSAGE?.find((s) => s.id === driver?.stateId)?.name;
  const cityName = citiesData?.MESSAGE?.find((c) => c.id === driver?.cityId)?.name;

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
    return <div className="py-8 text-center text-muted-foreground">Loading driver…</div>;
  }

  if (!driver || !driverId) {
    return <div className="py-8 text-center text-muted-foreground">Driver not found.</div>;
  }

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
    <div className="space-y-6">
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

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="cursor-pointer"
          >
            <Edit className="h-4 w-4 mr-1.5 text-primary" />
            Edit Driver
          </Button>

          <Button
            variant={driver.isBlocked ? "outline" : "destructive"}
            size="sm"
            onClick={handleToggleBlock}
            disabled={toggleBlockMutation.isPending}
            className="cursor-pointer"
          >
            <Ban className="h-4 w-4 mr-1.5" />
            {driver.isBlocked ? "Unblock Driver" : "Block Driver"}
          </Button>

          {/* Flexible status transition buttons based on current state */}
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

      {/* Driver Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border border-primary/20 shrink-0">
            {driver.name ? driver.name.charAt(0).toUpperCase() : "D"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {driver.name || "Unnamed Driver"}
              </h2>
              {driver.isOnline && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {driver.phone} {driver.email ? `• ${driver.email}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center text-xs text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">
                <Star className="h-3 w-3 mr-1 fill-amber-500" /> {driver.rating} ({driver.totalRatings} ratings • {driver.totalRides} rides)
              </span>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="text-right space-y-1">
            <div className="text-xs text-muted-foreground">Approval Status</div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block ${
                driver.approvalStatus === "approved"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : driver.approvalStatus === "rejected"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}
            >
              {driver.approvalStatus}
            </span>
          </div>

          <div className="text-right space-y-1 pl-4 border-l border-border">
            <div className="text-xs text-muted-foreground">Account Status</div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                driver.isBlocked
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {driver.isBlocked ? "Blocked" : "Active"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
              <CardDescription>Contact details and identity information.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-8 text-xs cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">Phone</span>
                <span className="font-medium text-foreground">{driver.phone}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Email</span>
                <span className="font-medium text-foreground">{driver.email || "—"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">Date of Birth</span>
                <span className="font-medium text-foreground">{driver.dateOfBirth || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Gender</span>
                <span className="font-medium text-foreground capitalize">{driver.gender || "—"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">Preferred Language</span>
                <span className="font-medium text-foreground uppercase">{driver.preferredLanguageCode || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Referral Code</span>
                <span className="font-medium text-foreground">{driver.referralCode || "—"}</span>
              </div>
            </div>
            {driver.licenseNumber && (
              <div>
                <span className="text-xs text-muted-foreground block">License Number</span>
                <span className="font-medium text-foreground">{driver.licenseNumber}</span>
              </div>
            )}
            {driver.aadharNumber && (
              <div>
                <span className="text-xs text-muted-foreground block">National ID / Aadhar</span>
                <span className="font-medium text-foreground">{driver.aadharNumber}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Status */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" /> Registration & Onboarding
              </CardTitle>
              <CardDescription>Onboarding progress and review decision history.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-8 text-xs cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">Registration Status</span>
                <span className="font-medium text-foreground capitalize">{driver.registrationStatus.replace(/_/g, " ")}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Registration Step</span>
                <span className="font-medium text-foreground">Step {driver.registrationStep} of 12</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Approval Status</span>
              <span className="font-medium text-foreground capitalize">
                {driver.approvalStatus}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Decision Remarks / Notes</span>
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

        {/* Driving Location */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Location & Territory
              </CardTitle>
              <CardDescription>Designated driving region and territory.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-8 text-xs cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Country</span>
              <span className="font-medium text-foreground">{countryName || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">State</span>
              <span className="font-medium text-foreground">{stateName || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">City</span>
              <span className="font-medium text-foreground">{cityName || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <WalletPanel ownerType="driver" ownerId={driverId} />

        <BankDetailsPanel ownerType="driver" ownerId={driverId} />

        {/* Registered Vehicles */}
        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4 text-primary" /> Registered Vehicles ({vehicles.length})
              </CardTitle>
              <CardDescription>
                Vehicles assigned to this driver. You can add, edit, or activate vehicles.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingVehicle(null);
                setIsAddVehicleOpen(true);
              }}
              className="h-8 text-xs cursor-pointer gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Vehicle
            </Button>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-lg">
                <p className="text-sm text-muted-foreground">No vehicle registered yet.</p>
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
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`border rounded-lg p-4 space-y-3 text-sm transition-all ${
                      vehicle.isActive
                        ? "border-primary/40 bg-primary/5 shadow-xs"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-base">
                        {vehicle.registrationNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          vehicle.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {vehicle.isActive ? "Primary Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="text-muted-foreground">
                      {vehicle.brand ? `${vehicle.brand} ` : ""}
                      <span className="font-semibold text-foreground">{vehicle.model}</span> ({vehicle.year})
                      {vehicle.color ? ` • Color: ${vehicle.color}` : ""}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {vehicle.seats && <span>{vehicle.seats} seats</span>}
                      {vehicle.fuelType && <span className="capitalize">{vehicle.fuelType}</span>}
                      {vehicle.transmission && (
                        <span className="capitalize">{vehicle.transmission}</span>
                      )}
                      {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
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

        <DriverSubscriptionPanel driverId={driverId} />

        {/* Uploaded Documents */}
        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" /> Uploaded Documents ({documents.length})
              </CardTitle>
              <CardDescription>Documents submitted for administrative review and verification.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRequestDocsOpen(true)}
              className="h-8 text-xs cursor-pointer gap-1.5"
            >
              <FilePlus2 className="h-3.5 w-3.5" /> Request Documents
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <p className="text-sm text-muted-foreground">Loading documents…</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-border rounded-lg p-4 flex flex-wrap items-start justify-between gap-3 bg-card"
                  >
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {formatDocCode(docTypeCodeMap.get(doc.documentTypeId) || "Document")}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[doc.status]}`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      {doc.documentNumber && (
                        <div className="text-muted-foreground">Doc #: {doc.documentNumber}</div>
                      )}
                      {doc.expiryDate && (
                        <div className="text-muted-foreground">
                          Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                      {doc.status === "rejected" && doc.rejectionReason && (
                        <div className="text-red-600 dark:text-red-400 text-xs">
                          Reason: {doc.rejectionReason}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 pt-1">
                        {doc.frontViewUrl && (
                          <a
                            href={doc.frontViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Front View
                          </a>
                        )}
                        {doc.backViewUrl && (
                          <a
                            href={doc.backViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Back View
                          </a>
                        )}
                        {doc.pdfViewUrl && (
                          <a
                            href={doc.pdfViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> PDF Document
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Verification actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveDocument(doc)}
                          disabled={verifyMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white cursor-pointer h-8 text-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      )}
                      {doc.status !== "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRejectDocument(doc)}
                          className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer h-8 text-xs"
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
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setIsEditOpen(true)}
          className="cursor-pointer"
        >
          <Edit className="h-4 w-4 mr-1.5 text-primary" />
          Edit Driver Details
        </Button>

        <Button
          variant="outline"
          onClick={() => setIsRequestDocsOpen(true)}
          className="cursor-pointer"
        >
          <FilePlus2 className="h-4 w-4 mr-1.5" />
          Request More Documents
        </Button>

        {driver.approvalStatus === "rejected" && (
          <>
            <Button
              onClick={() => setIsResetPendingOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Change to Pending
            </Button>
            <Button
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
              onClick={() => setIsResetPendingOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Change to Pending
            </Button>
            <Button
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
              variant="outline"
              onClick={() => setIsRejectOpen(true)}
              className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              <X className="h-4 w-4 mr-1.5" />
              Reject Application
            </Button>
            <Button
              onClick={() => setIsApproveOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Approve Partner
            </Button>
          </>
        )}
      </div>

      {/* Dialogs */}
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
        driverName={driver.name}
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
      <RejectDocumentDialog
        open={!!rejectingDoc}
        onOpenChange={(open) => { if (!open) setRejectingDoc(null); }}
        reason={documentRejectionReason}
        setReason={setDocumentRejectionReason}
        onSubmit={handleRejectDocumentSubmit}
        isPending={verifyMutation.isPending}
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
