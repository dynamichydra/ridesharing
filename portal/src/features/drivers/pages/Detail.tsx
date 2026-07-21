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
  RequestDocumentsDialog,
  RejectDocumentDialog,
} from "../components/dialog";
import { DriverSubscriptionPanel } from "../components/subscription-panel";
import { WalletPanel } from "@/features/wallets/components/wallet-panel";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import {
  useDriver,
  useDriverDocuments,
  useDocumentTypes,
  useVerifyDocument,
  useApproveDriver,
  useRejectDriver,
  useRequestDriverDocuments,
} from "../hooks";
import type { DriverDocument, DriverDocumentStatus } from "../types";

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

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRequestDocsOpen, setIsRequestDocsOpen] = useState(false);
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
      { id: driverId, note: approvalNote },
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

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" /> Location
            </CardTitle>
            <CardDescription>Driving location set during onboarding.</CardDescription>
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

        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-primary" /> Registered Vehicles
            </CardTitle>
            <CardDescription>
              Added by the driver from the mobile app — read-only here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicle registered yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="border border-border rounded-lg p-4 space-y-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {vehicle.registrationNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          vehicle.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {vehicle.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {vehicle.brand ? `${vehicle.brand} ` : ""}
                      {vehicle.model} ({vehicle.year})
                      {vehicle.color ? ` · ${vehicle.color}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {vehicle.seats && <span>{vehicle.seats} seats</span>}
                      {vehicle.fuelType && <span className="capitalize">{vehicle.fuelType}</span>}
                      {vehicle.transmission && (
                        <span className="capitalize">{vehicle.transmission}</span>
                      )}
                      {vehicle.vin && <span>VIN {vehicle.vin}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <DriverSubscriptionPanel driverId={driverId} />

        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Uploaded Documents
            </CardTitle>
            <CardDescription>Uploaded by the driver from the mobile app for review.</CardDescription>
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
                    className="border border-border rounded-lg p-4 flex flex-wrap items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {formatDocCode(docTypeCodeMap.get(doc.documentTypeId) || "Document")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[doc.status]}`}
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
                            <ExternalLink className="h-3 w-3" /> Front
                          </a>
                        )}
                        {doc.backViewUrl && (
                          <a
                            href={doc.backViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Back
                          </a>
                        )}
                        {doc.pdfViewUrl && (
                          <a
                            href={doc.pdfViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> PDF
                          </a>
                        )}
                      </div>
                    </div>

                    {doc.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRejectDocument(doc)}
                          className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer h-8 text-xs"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveDocument(doc)}
                          disabled={verifyMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white cursor-pointer h-8 text-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={() => setIsRequestDocsOpen(true)} className="cursor-pointer">
          <FilePlus2 className="h-4 w-4 mr-1" />
          Request More Documents
        </Button>
        {driver.approvalStatus === "pending" && (
          <>
            <Button
              variant="outline"
              onClick={() => setIsRejectOpen(true)}
              className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              <X className="h-4 w-4 mr-1" />
              Reject Application
            </Button>
            <Button
              onClick={() => setIsApproveOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve Partner
            </Button>
          </>
        )}
      </div>

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
    </div>
  );
}
