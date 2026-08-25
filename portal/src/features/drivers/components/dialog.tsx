import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  User,
  Car,
  RotateCcw,
  MapPin,
  ShieldCheck,
  Star,
  AlertCircle,
} from "lucide-react";
import DriverActionForm, { RequestDocumentsForm } from "./form";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import {
  useVehicleModelOptions,
  useUpdateDriver,
  useSetDriverPending,
  useAdminAddVehicle,
  useAdminUpdateVehicle,
} from "../hooks";
import type { Driver, DriverVehicle, UpdateDriverPayload, AdminVehiclePayload } from "../types";

// ── Approve Dialog ─────────────────────────────────────────────────────────────

interface ApproveDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function ApproveDriverDialog({
  open,
  onOpenChange,
  note,
  setNote,
  onSubmit,
  isPending,
}: ApproveDriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <ShieldCheck className="h-5 w-5" /> Approve Driver Application
          </DialogTitle>
          <DialogDescription>
            Approving this driver marks their account as verified and eligible to go online and receive rides.
          </DialogDescription>
        </DialogHeader>
        <DriverActionForm
          fieldId="approve-note"
          label="Onboarding Notes (Optional)"
          placeholder="e.g. Verified license and identity documents. Approved."
          note={note}
          setNote={setNote}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Approve Driver"
          submitClassName="bg-green-600 hover:bg-green-700 text-white"
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Dialog ──────────────────────────────────────────────────────────────

interface RejectDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function RejectDriverDialog({
  open,
  onOpenChange,
  note,
  setNote,
  onSubmit,
  isPending,
}: RejectDriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" /> Reject Application
          </DialogTitle>
          <DialogDescription>
            Specify the reason for rejection. The driver will receive a notification with these details.
          </DialogDescription>
        </DialogHeader>
        <DriverActionForm
          fieldId="reject-note"
          label="Rejection Note"
          required
          placeholder="e.g. Document image is unclear or vehicle registration expired."
          note={note}
          setNote={setNote}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Reject Driver"
          submitClassName="bg-red-600 hover:bg-red-700 text-white"
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Reset to Pending Dialog ───────────────────────────────────────────────────

interface ResetToPendingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName?: string | null;
}

export function ResetToPendingDialog({
  open,
  onOpenChange,
  driverId,
  driverName,
}: ResetToPendingDialogProps) {
  const [note, setNote] = useState("");
  const resetMutation = useSetDriverPending();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMutation.mutate(
      { id: driverId, note: note || undefined },
      {
        onSuccess: () => {
          setNote("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <RotateCcw className="h-5 w-5" /> Change Status to Pending Review
          </DialogTitle>
          <DialogDescription>
            Moving {driverName || "this driver"} back to Pending Review allows re-evaluating the
            application and documents.
          </DialogDescription>
        </DialogHeader>
        <DriverActionForm
          fieldId="pending-note"
          label="Reason for moving to Pending (Optional)"
          placeholder="e.g. Driver uploaded corrected documents; reviewing again."
          note={note}
          setNote={setNote}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Set to Pending Review"
          submitClassName="bg-amber-600 hover:bg-amber-700 text-white"
          isPending={resetMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Request Documents Dialog ──────────────────────────────────────────────────

interface RequestDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypeCodes: string;
  setDocumentTypeCodes: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function RequestDocumentsDialog({
  open,
  onOpenChange,
  documentTypeCodes,
  setDocumentTypeCodes,
  note,
  setNote,
  onSubmit,
  isPending,
}: RequestDocumentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Request More Documents</DialogTitle>
          <DialogDescription>
            Ask the driver to upload or update specific documents.
          </DialogDescription>
        </DialogHeader>
        <RequestDocumentsForm
          documentTypeCodes={documentTypeCodes}
          setDocumentTypeCodes={setDocumentTypeCodes}
          note={note}
          setNote={setNote}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Document Dialog ────────────────────────────────────────────────────

interface RejectDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  setReason: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function RejectDocumentDialog({
  open,
  onOpenChange,
  reason,
  setReason,
  onSubmit,
  isPending,
}: RejectDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Reject Document</DialogTitle>
          <DialogDescription>
            Tell the driver what is wrong so they know what to re-upload.
          </DialogDescription>
        </DialogHeader>
        <DriverActionForm
          fieldId="reject-document-reason"
          label="Rejection Reason"
          required
          placeholder="e.g. Photo is blurry, license number unreadable."
          note={reason}
          setNote={setReason}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Reject Document"
          submitClassName="bg-red-600 hover:bg-red-700 text-white"
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Driver Dialog (Full Administration) ──────────────────────────────────

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver;
}

export function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  const updateMutation = useUpdateDriver();

  const [form, setForm] = useState<UpdateDriverPayload>({});

  useEffect(() => {
    if (open && driver) {
      setForm({
        name: driver.name || "",
        phone: driver.phone || "",
        email: driver.email || "",
        profilePhoto: driver.profilePhoto || "",
        dateOfBirth: driver.dateOfBirth ? driver.dateOfBirth.slice(0, 10) : "",
        gender: driver.gender || "",
        preferredLanguageCode: driver.preferredLanguageCode || "",
        referralCode: driver.referralCode || "",
        countryId: driver.countryId || "",
        stateId: driver.stateId || "",
        cityId: driver.cityId || "",
        approvalStatus: driver.approvalStatus || "pending",
        registrationStatus: driver.registrationStatus || "pending_review",
        registrationStep: driver.registrationStep ?? 0,
        subscriptionStatus: (driver.subscriptionStatus as any) || "inactive",
        isBlocked: driver.isBlocked ?? false,
        isOnline: driver.isOnline ?? false,
        approvalNote: driver.approvalNote || "",
        rating: driver.rating || "5.00",
        totalRatings: driver.totalRatings ?? 0,
        totalRides: driver.totalRides ?? 0,
        vehicleNumber: driver.vehicleNumber || "",
        vehicleModel: driver.vehicleModel || "",
        vehicleYear: driver.vehicleYear || "",
        licenseNumber: driver.licenseNumber || "",
        aadharNumber: driver.aadharNumber || "",
      });
    }
  }, [open, driver]);

  const { data: countriesData } = useCountryOptions();
  const { data: statesData } = useStateOptions(form.countryId || undefined);
  const { data: citiesData } = useCityOptions(form.stateId || undefined);

  const countries = countriesData?.MESSAGE || [];
  const states = statesData?.MESSAGE || [];
  const cities = citiesData?.MESSAGE || [];

  const updateField = (field: keyof UpdateDriverPayload, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "countryId") {
        next.stateId = "";
        next.cityId = "";
      }
      if (field === "stateId") {
        next.cityId = "";
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver?.id) return;

    updateMutation.mutate(
      {
        id: driver.id,
        payload: {
          ...form,
          name: form.name?.trim() || null,
          phone: form.phone?.trim() || null,
          email: form.email?.trim() || null,
          profilePhoto: form.profilePhoto?.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          preferredLanguageCode: form.preferredLanguageCode?.trim() || null,
          referralCode: form.referralCode?.trim() || null,
          countryId: form.countryId || null,
          stateId: form.stateId || null,
          cityId: form.cityId || null,
          approvalNote: form.approvalNote || null,
          vehicleNumber: form.vehicleNumber?.trim() || null,
          vehicleModel: form.vehicleModel?.trim() || null,
          vehicleYear: form.vehicleYear?.trim() || null,
          licenseNumber: form.licenseNumber?.trim() || null,
          aadharNumber: form.aadharNumber?.trim() || null,
          registrationStep: Number(form.registrationStep) || 0,
          totalRatings: Number(form.totalRatings) || 0,
          totalRides: Number(form.totalRides) || 0,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="h-5 w-5 text-primary" /> Edit Driver Details
          </DialogTitle>
          <DialogDescription>
            Update any profile, driving location, status, verification decisions, and metrics for{" "}
            <span className="font-semibold text-foreground">{driver.name || "Driver"}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* 1. Personal & Contact Information */}
          <div className="space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
              <User className="h-4 w-4 text-primary" /> Personal & Contact Information
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  value={form.name || ""}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Full legal name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={form.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 555 0100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="driver@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={form.dateOfBirth || ""}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-gender">Gender</Label>
                <NativeSelect
                  id="edit-gender"
                  value={form.gender || ""}
                  onChange={(e) => updateField("gender", e.target.value)}
                >
                  <NativeSelectOption value="">Not specified</NativeSelectOption>
                  <NativeSelectOption value="male">Male</NativeSelectOption>
                  <NativeSelectOption value="female">Female</NativeSelectOption>
                  <NativeSelectOption value="other">Other</NativeSelectOption>
                  <NativeSelectOption value="prefer_not_to_say">Prefer not to say</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-lang">Preferred Language</Label>
                <Input
                  id="edit-lang"
                  value={form.preferredLanguageCode || ""}
                  onChange={(e) => updateField("preferredLanguageCode", e.target.value)}
                  placeholder="e.g. en, es, hi"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-referral">Referral Code</Label>
                <Input
                  id="edit-referral"
                  value={form.referralCode || ""}
                  onChange={(e) => updateField("referralCode", e.target.value)}
                  placeholder="e.g. REF123"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-photo">Profile Photo Key / URL</Label>
                <Input
                  id="edit-photo"
                  value={form.profilePhoto || ""}
                  onChange={(e) => updateField("profilePhoto", e.target.value)}
                  placeholder="Photo key or storage path"
                />
              </div>
            </div>
          </div>

          {/* 2. Driving Location */}
          <div className="space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
              <MapPin className="h-4 w-4 text-primary" /> Driving Location
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-country">Country</Label>
                <NativeSelect
                  id="edit-country"
                  value={form.countryId || ""}
                  onChange={(e) => updateField("countryId", e.target.value)}
                >
                  <NativeSelectOption value="">Select Country</NativeSelectOption>
                  {countries.map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name} ({c.isoCode})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-state">State / Province</Label>
                <NativeSelect
                  id="edit-state"
                  value={form.stateId || ""}
                  onChange={(e) => updateField("stateId", e.target.value)}
                  disabled={!form.countryId}
                >
                  <NativeSelectOption value="">
                    {!form.countryId ? "Pick country first" : "Select State"}
                  </NativeSelectOption>
                  {states.map((s) => (
                    <NativeSelectOption key={s.id} value={s.id}>
                      {s.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-city">City / Operating Zone</Label>
                <NativeSelect
                  id="edit-city"
                  value={form.cityId || ""}
                  onChange={(e) => updateField("cityId", e.target.value)}
                  disabled={!form.stateId}
                >
                  <NativeSelectOption value="">
                    {!form.stateId ? "Pick state first" : "Select City"}
                  </NativeSelectOption>
                  {cities.map((ct) => (
                    <NativeSelectOption key={ct.id} value={ct.id}>
                      {ct.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </div>

          {/* 3. Statuses & State Machine */}
          <div className="space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Approval, Registration & Status Controls
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-approval-status">Approval Status</Label>
                <NativeSelect
                  id="edit-approval-status"
                  value={form.approvalStatus || "pending"}
                  onChange={(e) => updateField("approvalStatus", e.target.value as any)}
                >
                  <NativeSelectOption value="pending">Pending Review</NativeSelectOption>
                  <NativeSelectOption value="approved">Approved</NativeSelectOption>
                  <NativeSelectOption value="rejected">Rejected</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-reg-status">Registration Status</Label>
                <NativeSelect
                  id="edit-reg-status"
                  value={form.registrationStatus || "pending_review"}
                  onChange={(e) => updateField("registrationStatus", e.target.value)}
                >
                  <NativeSelectOption value="new">New</NativeSelectOption>
                  <NativeSelectOption value="mobile_verified">Mobile Verified</NativeSelectOption>
                  <NativeSelectOption value="email_verified">Email Verified</NativeSelectOption>
                  <NativeSelectOption value="registration_in_progress">Registration In Progress</NativeSelectOption>
                  <NativeSelectOption value="documents_pending">Documents Pending</NativeSelectOption>
                  <NativeSelectOption value="pending_review">Pending Review</NativeSelectOption>
                  <NativeSelectOption value="under_verification">Under Verification</NativeSelectOption>
                  <NativeSelectOption value="approved">Approved</NativeSelectOption>
                  <NativeSelectOption value="rejected">Rejected</NativeSelectOption>
                  <NativeSelectOption value="suspended">Suspended</NativeSelectOption>
                  <NativeSelectOption value="active">Active</NativeSelectOption>
                  <NativeSelectOption value="inactive">Inactive</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-reg-step">Registration Step (0-12)</Label>
                <Input
                  id="edit-reg-step"
                  type="number"
                  min="0"
                  max="12"
                  value={form.registrationStep ?? 0}
                  onChange={(e) => updateField("registrationStep", parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-sub-status">Subscription Status</Label>
                <NativeSelect
                  id="edit-sub-status"
                  value={form.subscriptionStatus || "inactive"}
                  onChange={(e) => updateField("subscriptionStatus", e.target.value as any)}
                >
                  <NativeSelectOption value="active">Active</NativeSelectOption>
                  <NativeSelectOption value="inactive">Inactive</NativeSelectOption>
                  <NativeSelectOption value="expired">Expired</NativeSelectOption>
                </NativeSelect>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="edit-is-blocked"
                  checked={!!form.isBlocked}
                  onChange={(e) => updateField("isBlocked", e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <Label htmlFor="edit-is-blocked" className="cursor-pointer text-sm font-medium">
                  Block Account (Forbidden from driving)
                </Label>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="edit-is-online"
                  checked={!!form.isOnline}
                  onChange={(e) => updateField("isOnline", e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <Label htmlFor="edit-is-online" className="cursor-pointer text-sm font-medium">
                  Driver Is Currently Online
                </Label>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="edit-approval-note">Approval / Decision Note</Label>
              <Textarea
                id="edit-approval-note"
                value={form.approvalNote || ""}
                onChange={(e) => updateField("approvalNote", e.target.value)}
                placeholder="Reason, remarks, or instructions recorded for this driver..."
                rows={2}
              />
            </div>
          </div>

          {/* 4. Performance, Ratings & Metrics */}
          <div className="space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
              <Star className="h-4 w-4 text-amber-500" /> Ratings & Ride Stats
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-rating">Rating (0.00 - 5.00)</Label>
                <Input
                  id="edit-rating"
                  value={form.rating || "5.00"}
                  onChange={(e) => updateField("rating", e.target.value)}
                  placeholder="5.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-total-ratings">Total Ratings Count</Label>
                <Input
                  id="edit-total-ratings"
                  type="number"
                  min="0"
                  value={form.totalRatings ?? 0}
                  onChange={(e) => updateField("totalRatings", parseInt(e.target.value, 10))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-total-rides">Total Rides Completed</Label>
                <Input
                  id="edit-total-rides"
                  type="number"
                  min="0"
                  value={form.totalRides ?? 0}
                  onChange={(e) => updateField("totalRides", parseInt(e.target.value, 10))}
                />
              </div>
            </div>
          </div>

          {/* 5. Driver Level Vehicle & Documents Summary */}
          <div className="space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
              <Car className="h-4 w-4 text-primary" /> Active Vehicle & Document Identifiers
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-vehicle-num">Vehicle Reg Number</Label>
                <Input
                  id="edit-vehicle-num"
                  value={form.vehicleNumber || ""}
                  onChange={(e) => updateField("vehicleNumber", e.target.value)}
                  placeholder="e.g. DL-01-AB-1234"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-vehicle-model">Vehicle Model</Label>
                <Input
                  id="edit-vehicle-model"
                  value={form.vehicleModel || ""}
                  onChange={(e) => updateField("vehicleModel", e.target.value)}
                  placeholder="e.g. Toyota Prius"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-vehicle-year">Vehicle Year</Label>
                <Input
                  id="edit-vehicle-year"
                  value={form.vehicleYear || ""}
                  onChange={(e) => updateField("vehicleYear", e.target.value)}
                  placeholder="e.g. 2022"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-license-num">Driving License Number</Label>
                <Input
                  id="edit-license-num"
                  value={form.licenseNumber || ""}
                  onChange={(e) => updateField("licenseNumber", e.target.value)}
                  placeholder="e.g. DL987654321"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-aadhar-num">National ID / Aadhar Number</Label>
                <Input
                  id="edit-aadhar-num"
                  value={form.aadharNumber || ""}
                  onChange={(e) => updateField("aadharNumber", e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {updateMutation.isPending ? "Saving Changes..." : "Save All Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin Add / Edit Vehicle Dialog ───────────────────────────────────────────

interface AddEditVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  vehicle?: DriverVehicle | null;
}

export function AddEditVehicleDialog({
  open,
  onOpenChange,
  driverId,
  vehicle,
}: AddEditVehicleDialogProps) {
  const addMutation = useAdminAddVehicle(driverId);
  const updateMutation = useAdminUpdateVehicle(driverId);
  const { data: vehicleModelsData } = useVehicleModelOptions();
  const vehicleModels = vehicleModelsData?.MESSAGE || [];

  const [form, setForm] = useState<AdminVehiclePayload>({
    vehicleModelId: "",
    registrationNumber: "",
    year: String(new Date().getFullYear()),
    color: "",
    seats: 4,
    fuelType: "petrol",
    transmission: "manual",
    vin: "",
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      if (vehicle) {
        setForm({
          registrationNumber: vehicle.registrationNumber || "",
          year: vehicle.year || String(new Date().getFullYear()),
          color: vehicle.color || "",
          seats: vehicle.seats ?? 4,
          fuelType: vehicle.fuelType || "petrol",
          transmission: vehicle.transmission || "manual",
          vin: vehicle.vin || "",
          isActive: vehicle.isActive ?? true,
          model: vehicle.model,
          brand: vehicle.brand || "",
        });
      } else {
        setForm({
          vehicleModelId: "",
          registrationNumber: "",
          year: String(new Date().getFullYear()),
          color: "",
          seats: 4,
          fuelType: "petrol",
          transmission: "manual",
          vin: "",
          isActive: true,
        });
      }
    }
  }, [open, vehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.registrationNumber.trim() || !form.year.trim()) return;

    if (vehicle) {
      updateMutation.mutate(
        {
          vehicleId: vehicle.id,
          payload: {
            ...form,
            seats: Number(form.seats) || 4,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      addMutation.mutate(
        {
          ...form,
          seats: Number(form.seats) || 4,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            {vehicle ? "Edit Registered Vehicle" : "Add Driver Vehicle"}
          </DialogTitle>
          <DialogDescription>
            {vehicle
              ? "Update vehicle specs and active status."
              : "Register a new vehicle directly to this driver's fleet."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {!vehicle && (
            <div className="space-y-1.5">
              <Label htmlFor="veh-model-select">Vehicle Catalog Model <span className="text-red-500">*</span></Label>
              <NativeSelect
                id="veh-model-select"
                value={form.vehicleModelId || ""}
                onChange={(e) => setForm((p) => ({ ...p, vehicleModelId: e.target.value }))}
                required
              >
                <NativeSelectOption value="">Select Catalog Model</NativeSelectOption>
                {vehicleModels.map((m) => (
                  <NativeSelectOption key={m.id} value={m.id}>
                    {m.brand ? `${m.brand} ` : ""}{m.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="veh-reg">Registration Plate <span className="text-red-500">*</span></Label>
              <Input
                id="veh-reg"
                placeholder="e.g. DL-01-AB-1234"
                value={form.registrationNumber}
                onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value.toUpperCase() }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="veh-year">Manufacturing Year <span className="text-red-500">*</span></Label>
              <Input
                id="veh-year"
                placeholder="e.g. 2023"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="veh-color">Color</Label>
              <Input
                id="veh-color"
                placeholder="e.g. White"
                value={form.color || ""}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="veh-seats">Seats</Label>
              <Input
                id="veh-seats"
                type="number"
                min="1"
                max="50"
                value={form.seats ?? 4}
                onChange={(e) => setForm((p) => ({ ...p, seats: parseInt(e.target.value, 10) }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="veh-fuel">Fuel Type</Label>
              <NativeSelect
                id="veh-fuel"
                value={form.fuelType || "petrol"}
                onChange={(e) => setForm((p) => ({ ...p, fuelType: e.target.value }))}
              >
                <NativeSelectOption value="petrol">Petrol</NativeSelectOption>
                <NativeSelectOption value="diesel">Diesel</NativeSelectOption>
                <NativeSelectOption value="electric">Electric</NativeSelectOption>
                <NativeSelectOption value="cng">CNG</NativeSelectOption>
                <NativeSelectOption value="hybrid">Hybrid</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="veh-trans">Transmission</Label>
              <NativeSelect
                id="veh-trans"
                value={form.transmission || "manual"}
                onChange={(e) => setForm((p) => ({ ...p, transmission: e.target.value }))}
              >
                <NativeSelectOption value="manual">Manual</NativeSelectOption>
                <NativeSelectOption value="automatic">Automatic</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="veh-vin">VIN / Chassis No.</Label>
              <Input
                id="veh-vin"
                placeholder="Optional VIN"
                value={form.vin || ""}
                onChange={(e) => setForm((p) => ({ ...p, vin: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="veh-is-active"
              checked={!!form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <Label htmlFor="veh-is-active" className="cursor-pointer text-sm font-medium">
              Set as Driver's Primary Active Vehicle
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {isPending ? "Saving..." : vehicle ? "Update Vehicle" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
