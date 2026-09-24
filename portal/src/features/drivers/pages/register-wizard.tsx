import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  User,
  Car,
  FileText,
  Landmark,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Loader2,
  Trash2,
  Sparkles,
  Save,
  Clock,
  ExternalLink,
  Globe,
  Copy,
  Check,
  MapPin,
  Camera,
  Calendar,
  Eye,
  FileCheck,
  File as FileIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useVehicleModelsLookup, useDriver, useDocumentTypes, useDriverDocuments } from "../hooks";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import { vehiclesApi, driversApi, documentsApi } from "../api";
import { bankDetailsApi } from "@/features/bank-details/api";
import { useDriverPayoutSetup } from "@/features/bank-details/hooks";
import type { DocumentType } from "../types";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, label: "Personal & Photo", icon: User },
  { id: 2, label: "Vehicle & Photos", icon: Car },
  { id: 3, label: "Document Uploads", icon: FileText },
  { id: 4, label: "Bank & Payouts", icon: Landmark },
  { id: 5, label: "Review & Submit", icon: CheckCircle2 },
];

export interface DocItemState {
  documentTypeId: string;
  code: string;
  name: string;
  documentNumber: string;
  expiryDate: string;
  frontUrl: string;
  backUrl: string;
  pdfUrl: string;
  status?: string;
  rejectionReason?: string;
  requiresFront: boolean;
  requiresBack: boolean;
  requiresPdf: boolean;
  requiresExpiry: boolean;
  requiresDocNumber: boolean;
}

const DEFAULT_DOC_TYPES: DocumentType[] = [
  {
    id: "dt-license",
    code: "DRIVING_LICENSE",
    requiresFront: true,
    requiresBack: true,
    requiresPdf: false,
    requiresExpiry: true,
    requiresDocNumber: true,
    maxFileSizeMb: 5,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "dt-national-id",
    code: "AADHAR_CARD",
    requiresFront: true,
    requiresBack: true,
    requiresPdf: false,
    requiresExpiry: false,
    requiresDocNumber: true,
    maxFileSizeMb: 5,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "dt-insurance",
    code: "VEHICLE_INSURANCE",
    requiresFront: true,
    requiresBack: false,
    requiresPdf: true,
    requiresExpiry: true,
    requiresDocNumber: true,
    maxFileSizeMb: 5,
    isActive: true,
    sortOrder: 3,
  },
];

function formatDocTitle(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function DriverRegisterWizardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const existingDriverId = searchParams.get("driverId");

  const [currentStep, setCurrentStep] = useState(1);
  const [driverId, setDriverId] = useState<string | null>(existingDriverId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);

  const { data: vehicleModelsData } = useVehicleModelsLookup();
  const vehicleModels = vehicleModelsData?.MESSAGE ?? [];

  // Cascading Location lookups
  const { data: countriesData, isLoading: isLoadingCountries } = useCountryOptions();
  const countries = countriesData?.MESSAGE ?? [];

  // Document types & existing documents
  const { data: docTypesData, isLoading: isLoadingDocTypes } = useDocumentTypes();
  const docTypes: DocumentType[] = useMemo(() => {
    const raw = docTypesData?.MESSAGE;
    if (raw && raw.length > 0) return raw;
    return DEFAULT_DOC_TYPES;
  }, [docTypesData]);

  // If editing an existing driver, fetch their profile & documents
  const { data: existingDriverData } = useDriver(driverId || undefined);
  const existingSummary = existingDriverData?.MESSAGE;
  const existingDriver = existingSummary?.driver;
  const existingVehicles = existingSummary?.vehicles ?? [];
  const existingActiveVehicle = existingVehicles.find((v) => v.isActive) || existingVehicles[0];

  const { data: existingDocsData } = useDriverDocuments(driverId || undefined);
  const existingDocs = existingDocsData?.MESSAGE ?? [];

  const { data: payoutSetupData } = useDriverPayoutSetup(driverId || undefined);
  const payoutSetup = payoutSetupData?.MESSAGE ?? null;
  const isStripeHosted = payoutSetup?.type === "hosted_redirect";
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyStripeLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Stripe Onboarding link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal & Photo & Location
    name: "",
    phone: "",
    email: "",
    profilePhoto: "",
    dateOfBirth: "",
    gender: "male",
    referralCode: "",
    countryId: "",
    stateId: "",
    cityId: "",
    // Step 2: Vehicle
    vehicleModelId: "",
    year: new Date().getFullYear().toString(),
    registrationNumber: "",
    color: "",
    seats: 4,
    fuelType: "petrol",
    transmission: "automatic",
    image: "",
    images: [] as string[],
    // Step 3: Docs
    licenseNumber: "",
    licenseDocUrl: "",
    aadharNumber: "",
    aadharDocUrl: "",
    // Step 4: Bank
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    routingCode: "",
  });

  // Dynamic document records state
  const [docsState, setDocsState] = useState<Record<string, DocItemState>>({});

  // Initialize or update docsState when docTypes or existing documents arrive
  useEffect(() => {
    setDocsState((prev) => {
      const next: Record<string, DocItemState> = { ...prev };
      docTypes.forEach((dt) => {
        const existing = existingDocs.find((d) => d.documentTypeId === dt.id);
        const code = dt.code.toUpperCase();
        
        let initialDocNumber = existing?.documentNumber || "";
        let initialFrontUrl = existing?.frontViewUrl || existing?.frontUrl || "";
        let initialBackUrl = existing?.backViewUrl || existing?.backUrl || "";
        let initialPdfUrl = existing?.pdfViewUrl || existing?.pdfUrl || "";
        let initialExpiry = existing?.expiryDate ? existing.expiryDate.split("T")[0] : "";

        // Fallback from legacy driver record
        if (!initialDocNumber && code.includes("LICENSE") && existingDriver?.licenseNumber) {
          initialDocNumber = existingDriver.licenseNumber;
        }
        if (!initialFrontUrl && code.includes("LICENSE") && existingDriver?.licenseDoc) {
          initialFrontUrl = existingDriver.licenseDoc;
        }
        if (!initialDocNumber && (code.includes("AADHAR") || code.includes("NATIONAL")) && existingDriver?.aadharNumber) {
          initialDocNumber = existingDriver.aadharNumber;
        }
        if (!initialFrontUrl && (code.includes("AADHAR") || code.includes("NATIONAL")) && existingDriver?.aadharDoc) {
          initialFrontUrl = existingDriver.aadharDoc;
        }

        if (!next[dt.id]) {
          next[dt.id] = {
            documentTypeId: dt.id,
            code: dt.code,
            name: formatDocTitle(dt.code),
            documentNumber: initialDocNumber,
            expiryDate: initialExpiry,
            frontUrl: initialFrontUrl,
            backUrl: initialBackUrl,
            pdfUrl: initialPdfUrl,
            status: existing?.status || "missing",
            rejectionReason: existing?.rejectionReason || "",
            requiresFront: dt.requiresFront ?? true,
            requiresBack: dt.requiresBack ?? false,
            requiresPdf: dt.requiresPdf ?? false,
            requiresExpiry: dt.requiresExpiry ?? false,
            requiresDocNumber: dt.requiresDocNumber ?? true,
          };
        } else {
          // Merge in any loaded server data if empty locally
          next[dt.id] = {
            ...next[dt.id],
            name: formatDocTitle(dt.code),
            requiresFront: dt.requiresFront ?? next[dt.id].requiresFront,
            requiresBack: dt.requiresBack ?? next[dt.id].requiresBack,
            requiresPdf: dt.requiresPdf ?? next[dt.id].requiresPdf,
            requiresExpiry: dt.requiresExpiry ?? next[dt.id].requiresExpiry,
            requiresDocNumber: dt.requiresDocNumber ?? next[dt.id].requiresDocNumber,
            documentNumber: next[dt.id].documentNumber || initialDocNumber,
            frontUrl: next[dt.id].frontUrl || initialFrontUrl,
            backUrl: next[dt.id].backUrl || initialBackUrl,
            pdfUrl: next[dt.id].pdfUrl || initialPdfUrl,
            expiryDate: next[dt.id].expiryDate || initialExpiry,
            status: existing?.status || next[dt.id].status,
            rejectionReason: existing?.rejectionReason || next[dt.id].rejectionReason,
          };
        }
      });
      return next;
    });
  }, [docTypes, existingDocs, existingDriver]);

  const { data: statesData, isLoading: isLoadingStates } = useStateOptions(formData.countryId || undefined);
  const states = statesData?.MESSAGE ?? [];

  const { data: citiesData, isLoading: isLoadingCities } = useCityOptions(formData.stateId || undefined);
  const cities = citiesData?.MESSAGE ?? [];

  // Pre-fill form when editing an existing driver
  useEffect(() => {
    if (existingDriver) {
      setFormData((prev) => ({
        ...prev,
        name: existingDriver.name || prev.name,
        phone: existingDriver.phone || prev.phone,
        email: existingDriver.email || prev.email,
        profilePhoto: existingDriver.profilePhoto || prev.profilePhoto,
        dateOfBirth: existingDriver.dateOfBirth || prev.dateOfBirth,
        gender: existingDriver.gender || prev.gender,
        referralCode: existingDriver.referralCode || prev.referralCode,
        countryId: existingDriver.countryId || prev.countryId,
        stateId: existingDriver.stateId || prev.stateId,
        cityId: existingDriver.cityId || prev.cityId,
        licenseNumber: existingDriver.licenseNumber || prev.licenseNumber,
        licenseDocUrl: existingDriver.licenseDoc || prev.licenseDocUrl,
        aadharNumber: existingDriver.aadharNumber || prev.aadharNumber,
        aadharDocUrl: existingDriver.aadharDoc || prev.aadharDocUrl,
        ...(existingActiveVehicle
          ? {
              vehicleModelId: existingActiveVehicle.vehicleModelId || prev.vehicleModelId,
              year: existingActiveVehicle.year || prev.year,
              registrationNumber: existingActiveVehicle.registrationNumber || prev.registrationNumber,
              color: existingActiveVehicle.color || prev.color,
              seats: existingActiveVehicle.seats || prev.seats,
              fuelType: existingActiveVehicle.fuelType || prev.fuelType,
              transmission: existingActiveVehicle.transmission || prev.transmission,
              image: existingActiveVehicle.image || prev.image,
              images: existingActiveVehicle.images || prev.images,
            }
          : {}),
      }));
    }
  }, [existingDriver, existingActiveVehicle]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (countryId: string) => {
    setFormData((prev) => ({
      ...prev,
      countryId,
      stateId: "",
      cityId: "",
    }));
  };

  const handleStateChange = (stateId: string) => {
    setFormData((prev) => ({
      ...prev,
      stateId,
      cityId: "",
    }));
  };

  // Handle Driver Profile Photo upload
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingProfilePhoto(true);
      const res = await driversApi.uploadPhoto(file);
      handleChange("profilePhoto", res.url);
      toast.success("Driver profile photo uploaded successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || err?.message || "Failed to upload profile photo");
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  };

  // Handle vehicle image upload
  const handleVehiclePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const res = await vehiclesApi.uploadImage(file);
      handleChange("image", res.url);
      handleChange("images", [...formData.images, res.url]);
      toast.success("Vehicle photo uploaded successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || err?.message || "Failed to upload vehicle photo");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Document File Upload (front, back, pdf)
  const handleDocFileUpload = async (
    docTypeId: string,
    side: "front" | "back" | "pdf",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = `${docTypeId}_${side}`;
    try {
      setUploadingDocKey(key);
      const res = await documentsApi.uploadFile(file);
      
      setDocsState((prev) => {
        const item = prev[docTypeId] || {
          documentTypeId: docTypeId,
          code: "",
          name: "",
          documentNumber: "",
          expiryDate: "",
          frontUrl: "",
          backUrl: "",
          pdfUrl: "",
          requiresFront: true,
          requiresBack: false,
          requiresPdf: false,
          requiresExpiry: false,
          requiresDocNumber: true,
        };

        const updated = {
          ...item,
          [`${side}Url`]: res.url,
          status: "pending",
        };

        // If this is license or aadhar, also update formData legacy fields
        if (item.code.toUpperCase().includes("LICENSE") && side === "front") {
          handleChange("licenseDocUrl", res.url);
        }
        if (
          (item.code.toUpperCase().includes("AADHAR") || item.code.toUpperCase().includes("NATIONAL")) &&
          side === "front"
        ) {
          handleChange("aadharDocUrl", res.url);
        }

        return {
          ...prev,
          [docTypeId]: updated,
        };
      });

      toast.success(`${side.toUpperCase()} document uploaded successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.MESSAGE || err?.message || `Failed to upload ${side} document`);
    } finally {
      setUploadingDocKey(null);
    }
  };

  const handleDocFieldChange = (docTypeId: string, field: "documentNumber" | "expiryDate", val: string) => {
    setDocsState((prev) => {
      const item = prev[docTypeId];
      if (!item) return prev;
      return {
        ...prev,
        [docTypeId]: {
          ...item,
          [field]: val,
        },
      };
    });

    // Also sync legacy form state if applicable
    const code = docsState[docTypeId]?.code.toUpperCase() || "";
    if (field === "documentNumber") {
      if (code.includes("LICENSE")) handleChange("licenseNumber", val);
      if (code.includes("AADHAR") || code.includes("NATIONAL")) handleChange("aadharNumber", val);
    }
  };

  const handleRemoveDocFile = (docTypeId: string, side: "front" | "back" | "pdf") => {
    setDocsState((prev) => {
      const item = prev[docTypeId];
      if (!item) return prev;
      return {
        ...prev,
        [docTypeId]: {
          ...item,
          [`${side}Url`]: "",
        },
      };
    });
  };

  // Save current step data to database
  const saveStepProgress = async (stepToSave: number): Promise<string | null> => {
    try {
      setIsSaving(true);
      let targetId = driverId;

      // ── Step 1: Save Personal Info & Profile Photo ─────────────────────────
      if (stepToSave === 1 || !targetId) {
        if (!formData.name.trim()) {
          toast.error("Please enter the driver's full legal name");
          return null;
        }
        if (!formData.phone.trim() && !formData.email.trim()) {
          toast.error("Please enter at least a mobile phone number or email address");
          return null;
        }

        if (!formData.countryId) {
          toast.error("Please select an operating country (required for vehicle & payout rules in next steps)");
          return null;
        }

        if (!targetId) {
          // Create initial driver record
          const driverRes: any = await driversApi.create({
            name: formData.name.trim(),
            phone: formData.phone?.trim() || undefined,
            email: formData.email?.trim() || undefined,
            profilePhoto: formData.profilePhoto || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            gender: formData.gender,
            referralCode: formData.referralCode?.trim() || undefined,
            countryId: formData.countryId || undefined,
            stateId: formData.stateId || undefined,
            cityId: formData.cityId || undefined,
          });
          targetId = driverRes.id || driverRes.MESSAGE?.id || driverRes.data?.id;
          if (targetId) {
            setDriverId(targetId);
            setSearchParams({ driverId: targetId });
          }
        } else {
          // Update existing driver record
          await driversApi.update(targetId, {
            name: formData.name.trim(),
            phone: formData.phone?.trim() || undefined,
            email: formData.email?.trim() || undefined,
            profilePhoto: formData.profilePhoto || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            gender: formData.gender,
            referralCode: formData.referralCode?.trim() || undefined,
            countryId: formData.countryId || undefined,
            stateId: formData.stateId || undefined,
            cityId: formData.cityId || undefined,
          });
        }
      }

      // ── Step 2: Save Vehicle Info & Photos ─────────────────────────────────
      if (stepToSave === 2) {
        if (!targetId) {
          toast.error("Driver record not found. Please complete Step 1 first.");
          return null;
        }
        if (!formData.vehicleModelId && !existingActiveVehicle?.id) {
          toast.error("Please select a vehicle model from the catalog");
          return null;
        }
        if (!formData.registrationNumber.trim()) {
          toast.error("Please enter the vehicle registration plate number");
          return null;
        }
        if (!formData.year.trim()) {
          toast.error("Please enter the vehicle manufacturing year");
          return null;
        }

        const vehiclePayload = {
          vehicleModelId: formData.vehicleModelId || undefined,
          year: formData.year.trim(),
          registrationNumber: formData.registrationNumber.trim().toUpperCase(),
          color: formData.color?.trim() || undefined,
          seats: Number(formData.seats) || 4,
          fuelType: formData.fuelType,
          transmission: formData.transmission,
          image: formData.image || undefined,
          images: formData.images?.length ? formData.images : (formData.image ? [formData.image] : []),
          isActive: true,
        };

        if (existingActiveVehicle?.id) {
          await vehiclesApi.update(targetId, existingActiveVehicle.id, vehiclePayload);
        } else {
          await vehiclesApi.add(targetId, vehiclePayload);
        }
      }

      // ── Step 3: Save Document Uploads & Metadata ───────────────────────────
      if (stepToSave === 3 && targetId) {
        // 1. Save all structured document records to /documents/admin/drivers/:driverId
        const docPromises = Object.values(docsState).map(async (doc) => {
          // Only save if document has an actual number, date, or uploaded files
          const hasData = doc.frontUrl || doc.backUrl || doc.pdfUrl || doc.documentNumber || doc.expiryDate;
          if (!hasData) return null;

          // If id is a real DB uuid (not dt- fallback), persist to document repository
          if (doc.documentTypeId && !doc.documentTypeId.startsWith("dt-")) {
            return documentsApi.saveDriverDocument(targetId!, {
              documentTypeId: doc.documentTypeId,
              frontUrl: doc.frontUrl || undefined,
              backUrl: doc.backUrl || undefined,
              pdfUrl: doc.pdfUrl || undefined,
              documentNumber: doc.documentNumber || undefined,
              expiryDate: doc.expiryDate || undefined,
            });
          }
          return null;
        });

        await Promise.all(docPromises.filter(Boolean));

        // 2. Also sync legacy driver columns for license and aadhar
        let licenseNo = formData.licenseNumber;
        let licenseDoc = formData.licenseDocUrl;
        let aadharNo = formData.aadharNumber;
        let aadharDoc = formData.aadharDocUrl;

        Object.values(docsState).forEach((doc) => {
          const code = doc.code.toUpperCase();
          if (code.includes("LICENSE")) {
            if (doc.documentNumber) licenseNo = doc.documentNumber;
            if (doc.frontUrl) licenseDoc = doc.frontUrl;
          }
          if (code.includes("AADHAR") || code.includes("NATIONAL")) {
            if (doc.documentNumber) aadharNo = doc.documentNumber;
            if (doc.frontUrl) aadharDoc = doc.frontUrl;
          }
        });

        await driversApi.update(targetId, {
          licenseNumber: licenseNo || undefined,
          licenseDoc: licenseDoc || undefined,
          aadharNumber: aadharNo || undefined,
          aadharDoc: aadharDoc || undefined,
        });
      }

      // ── Step 4: Save Bank Details ──────────────────────────────────────────
      if (stepToSave === 4 && targetId && formData.accountNumber.trim()) {
        await bankDetailsApi.upsert("driver", targetId, {
          accountHolderName: formData.accountHolderName || formData.name,
          bankName: formData.bankName || "Primary Bank",
          accountNumber: formData.accountNumber,
          routingCode: formData.routingCode || undefined,
        });
      }

      return targetId;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.MESSAGE ||
        err?.data?.MESSAGE ||
        err?.message ||
        "Failed to save progress";
      toast.error(typeof errorMsg === "string" ? errorMsg : "Failed to save progress");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Next step click
  const handleNext = async () => {
    const savedId = await saveStepProgress(currentStep);
    if (!savedId) return;

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Save progress and exit to driver detail
  const handleSaveAndExit = async () => {
    const savedId = await saveStepProgress(currentStep);
    if (savedId) {
      toast.success("Progress saved! You can resume registration anytime.");
      navigate(`/drivers/${savedId}`);
    }
  };

  // Final Submit Application
  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      if (driverId) {
        await saveStepProgress(4);
        toast.success("Driver onboarding and application completed!");
        navigate(`/drivers/${driverId}`);
      } else {
        navigate("/drivers");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to complete driver registration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-11/12 mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to={driverId ? `/drivers/${driverId}` : "/drivers"}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {driverId ? "Back to Driver Profile" : "Back to Drivers List"}
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            {driverId ? "Resume Driver Registration" : "New Driver Registration"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Step-by-step registration wizard. You can complete all steps now or save and finish anytime.
          </p>
        </div>

        {/* Save & Finish Later action */}
        {driverId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveAndExit}
            disabled={isSaving}
            className="text-xs h-9 cursor-pointer gap-1.5 self-start sm:self-auto border-primary/30 text-primary hover:bg-primary/5"
          >
            <Save className="h-3.5 w-3.5" />
            Save & Finish Later
          </Button>
        )}
      </div>

      {/* Existing Driver Banner */}
      {driverId && existingDriver && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span>
              Onboarding in progress for: <strong className="text-primary">{existingDriver.name || "Driver"}</strong> (ID: #DRV-{driverId.slice(0, 8).toUpperCase()})
            </span>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">
            {existingDriver.registrationStatus?.replace(/_/g, " ") || "In Progress"}
          </span>
        </div>
      )}

      {/* Wizard Step Bar */}
      <div className="grid grid-cols-5 gap-2 border-b border-border pb-4">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isDone = currentStep > s.id;
          const isCurrent = currentStep === s.id;

          return (
            <button
              key={s.id}
              onClick={async () => {
                if (s.id > currentStep) {
                  const savedId = await saveStepProgress(currentStep);
                  if (!savedId) return;
                }
                setCurrentStep(s.id);
              }}
              className={`flex flex-col items-center gap-1 text-center group cursor-pointer transition-colors ${
                isCurrent
                  ? "text-primary font-bold"
                  : isDone
                  ? "text-foreground font-medium"
                  : "text-muted-foreground opacity-60"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-xs transition-all ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20"
                    : isDone
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="text-[11px] sm:text-xs truncate max-w-full">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form Content Card */}
      <Card className="border-border bg-card shadow-sm">
        {/* Step 1: Personal Information & Profile Photo */}
        {currentStep === 1 && (
          <div>
            <CardHeader className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Step 1: Personal Details & Profile Photo</CardTitle>
              </div>
              <CardDescription>
                Basic identification, contact information, and driver headshot portrait.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* ── Profile Photo Upload Widget ── */}
              <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-primary/40 bg-card shadow-inner flex items-center justify-center text-primary font-bold text-3xl">
                    {formData.profilePhoto ? (
                      <img
                        src={formData.profilePhoto}
                        alt="Driver Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-primary/40" />
                    )}
                  </div>
                  {isUploadingProfilePhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                      <Camera className="h-4 w-4 text-primary" /> Driver Profile Photo
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upload a clear, front-facing passport-style portrait. JPG, PNG, or WEBP up to 5MB.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePhotoUpload}
                        disabled={isUploadingProfilePhoto}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploadingProfilePhoto}
                        className="text-xs h-8 gap-1.5 cursor-pointer border-primary/30 text-primary hover:bg-primary/10"
                        asChild
                      >
                        <span>
                          <UploadCloud className="h-3.5 w-3.5" />
                          {formData.profilePhoto ? "Change Photo" : "Upload Photo"}
                        </span>
                      </Button>
                    </label>

                    {formData.profilePhoto && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChange("profilePhoto", "")}
                        className="text-xs h-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Personal Info Fields ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Full Legal Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Johnathan Miller"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Mobile Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="driver@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender</Label>
                  <NativeSelect
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                  <Input
                    id="referralCode"
                    placeholder="e.g. REF-2024"
                    value={formData.referralCode}
                    onChange={(e) => handleChange("referralCode", e.target.value)}
                  />
                </div>

                {/* ── Operating Location & Jurisdiction ── */}
                <div className="sm:col-span-2 pt-4 mt-2 border-t border-border/80">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Operating Jurisdiction & Location</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Required for matching vehicle types, local document compliance, and automatic payout gateway setup in subsequent steps.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="country" className="flex items-center justify-between text-xs">
                        <span>Operating Country *</span>
                        {isLoadingCountries && <span className="text-[10px] text-muted-foreground">Loading...</span>}
                      </Label>
                      <NativeSelect
                        id="country"
                        value={formData.countryId}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        required
                      >
                        <option value="">-- Select Country --</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.isoCode})
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="flex items-center justify-between text-xs">
                        <span>State / Province</span>
                        {isLoadingStates && <span className="text-[10px] text-muted-foreground">Loading...</span>}
                      </Label>
                      <NativeSelect
                        id="state"
                        value={formData.stateId}
                        onChange={(e) => handleStateChange(e.target.value)}
                        disabled={!formData.countryId || isLoadingStates}
                      >
                        <option value="">
                          {!formData.countryId
                            ? "-- Select Country First --"
                            : isLoadingStates
                            ? "Loading states..."
                            : "-- Select State / Province --"}
                        </option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="flex items-center justify-between text-xs">
                        <span>City / Operating Hub</span>
                        {isLoadingCities && <span className="text-[10px] text-muted-foreground">Loading...</span>}
                      </Label>
                      <NativeSelect
                        id="city"
                        value={formData.cityId}
                        onChange={(e) => handleChange("cityId", e.target.value)}
                        disabled={!formData.stateId || isLoadingCities}
                      >
                        <option value="">
                          {!formData.stateId
                            ? "-- Select State First --"
                            : isLoadingCities
                            ? "Loading cities..."
                            : "-- Select City / Hub --"}
                        </option>
                        {cities.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            {ct.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Step 2: Vehicle Details & Photo Upload */}
        {currentStep === 2 && (
          <div>
            <CardHeader className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Step 2: Vehicle Details & Photo</CardTitle>
              </div>
              <CardDescription>
                Register the active vehicle and upload vehicle exterior photographs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="vehicleModel">Catalog Vehicle Model</Label>
                  <NativeSelect
                    id="vehicleModel"
                    value={formData.vehicleModelId}
                    onChange={(e) => handleChange("vehicleModelId", e.target.value)}
                  >
                    <option value="">-- Select from Catalog --</option>
                    {vehicleModels.map((vm) => (
                      <option key={vm.id} value={vm.id}>
                        {vm.brand} {vm.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regNo">License Plate / Registration Number *</Label>
                  <Input
                    id="regNo"
                    placeholder="e.g. WB-02-AB-1234"
                    value={formData.registrationNumber}
                    onChange={(e) => handleChange("registrationNumber", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year">Manufacturing Year *</Label>
                  <Input
                    id="year"
                    placeholder="e.g. 2023"
                    value={formData.year}
                    onChange={(e) => handleChange("year", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="color">Vehicle Color</Label>
                  <Input
                    id="color"
                    placeholder="e.g. Pearl White / Midnight Black"
                    value={formData.color}
                    onChange={(e) => handleChange("color", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <NativeSelect
                    id="fuelType"
                    value={formData.fuelType}
                    onChange={(e) => handleChange("fuelType", e.target.value)}
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric (EV)</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="cng">CNG</option>
                  </NativeSelect>
                </div>
              </div>

              {/* Vehicle Photo Upload Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-sm font-semibold">Vehicle Exterior Photograph</Label>
                <p className="text-xs text-muted-foreground">
                  Upload a clear, well-lit photo showing the vehicle and license plate.
                </p>

                {formData.image ? (
                  <div className="relative rounded-xl border border-border overflow-hidden h-48 sm:h-56 bg-muted/30 flex items-center justify-center group">
                    <img
                      src={formData.image}
                      alt="Vehicle Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleChange("image", "")}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-colors rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer min-h-[160px]">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleVehiclePhotoUpload}
                      disabled={isUploadingImage}
                    />
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Uploading vehicle photo...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                          <UploadCloud className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-semibold text-foreground">
                          Click to upload vehicle photo
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Supports PNG, JPG, WEBP up to 5MB
                        </p>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </CardContent>
          </div>
        )}

        {/* Step 3: Document Uploads & Verification */}
        {currentStep === 3 && (
          <div>
            <CardHeader className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Step 3: Document Uploads & Verification</CardTitle>
              </div>
              <CardDescription>
                Upload required licenses, identity cards, vehicle documents, and enter official document numbers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {isLoadingDocTypes && Object.keys(docsState).length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Loading document verification requirements...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(docsState).map((doc) => {
                    const isFrontUploading = uploadingDocKey === `${doc.documentTypeId}_front`;
                    const isBackUploading = uploadingDocKey === `${doc.documentTypeId}_back`;
                    const isPdfUploading = uploadingDocKey === `${doc.documentTypeId}_pdf`;

                    const hasAnyFile = !!(doc.frontUrl || doc.backUrl || doc.pdfUrl);

                    return (
                      <div
                        key={doc.documentTypeId}
                        className="rounded-xl border border-border bg-muted/10 p-4 sm:p-5 space-y-4 hover:border-primary/30 transition-colors"
                      >
                        {/* Doc Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <FileCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                {doc.name || formatDocTitle(doc.code)}
                                <Badge variant="outline" className="text-[10px] font-mono uppercase">
                                  {doc.code}
                                </Badge>
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                Front {doc.requiresBack ? "& Back " : ""}Document Photo or Scan
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {hasAnyFile ? (
                              <Badge className="bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/30 text-xs font-semibold">
                                <Check className="h-3 w-3 mr-1" /> Ready
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Upload Required
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Doc Number & Expiry Date Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {doc.requiresDocNumber && (
                            <div className="space-y-1.5">
                              <Label htmlFor={`doc-num-${doc.documentTypeId}`} className="text-xs font-semibold">
                                Document / License Number
                              </Label>
                              <Input
                                id={`doc-num-${doc.documentTypeId}`}
                                placeholder={`e.g. ${doc.code.includes("LICENSE") ? "DL-1420110012345" : "XXXX-XXXX-XXXX"}`}
                                value={doc.documentNumber}
                                onChange={(e) =>
                                  handleDocFieldChange(doc.documentTypeId, "documentNumber", e.target.value)
                                }
                              />
                            </div>
                          )}

                          {doc.requiresExpiry && (
                            <div className="space-y-1.5">
                              <Label htmlFor={`doc-exp-${doc.documentTypeId}`} className="text-xs font-semibold flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Expiration Date
                              </Label>
                              <Input
                                id={`doc-exp-${doc.documentTypeId}`}
                                type="date"
                                value={doc.expiryDate}
                                onChange={(e) =>
                                  handleDocFieldChange(doc.documentTypeId, "expiryDate", e.target.value)
                                }
                              />
                            </div>
                          )}
                        </div>

                        {/* File Upload Grid (Front, Back, PDF) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {/* Front Side Upload */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-foreground flex items-center justify-between">
                              <span>Front Side Document *</span>
                              {doc.frontUrl && <span className="text-[10px] text-green-600 font-medium">Uploaded</span>}
                            </span>

                            {doc.frontUrl ? (
                              <div className="relative rounded-lg border border-border overflow-hidden h-36 bg-card flex items-center justify-center group">
                                <img
                                  src={doc.frontUrl}
                                  alt={`${doc.name} Front`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <a href={doc.frontUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline" className="h-7 text-xs bg-black/60 text-white border-white/20">
                                      <Eye className="h-3 w-3 mr-1" /> View
                                    </Button>
                                  </a>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs"
                                    onClick={() => handleRemoveDocFile(doc.documentTypeId, "front")}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-colors rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer h-36 text-center">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => handleDocFileUpload(doc.documentTypeId, "front", e)}
                                  disabled={isFrontUploading}
                                />
                                {isFrontUploading ? (
                                  <div className="flex flex-col items-center gap-1.5">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-[11px] text-muted-foreground">Uploading front side...</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <UploadCloud className="h-5 w-5 text-primary mb-1" />
                                    <span className="text-xs font-semibold text-foreground">Upload Front Side</span>
                                    <span className="text-[10px] text-muted-foreground">JPG, PNG, PDF up to 5MB</span>
                                  </div>
                                )}
                              </label>
                            )}
                          </div>

                          {/* Back Side Upload */}
                          {doc.requiresBack && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-semibold text-foreground flex items-center justify-between">
                                <span>Back Side Document</span>
                                {doc.backUrl && <span className="text-[10px] text-green-600 font-medium">Uploaded</span>}
                              </span>

                              {doc.backUrl ? (
                                <div className="relative rounded-lg border border-border overflow-hidden h-36 bg-card flex items-center justify-center group">
                                  <img
                                    src={doc.backUrl}
                                    alt={`${doc.name} Back`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <a href={doc.backUrl} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="outline" className="h-7 text-xs bg-black/60 text-white border-white/20">
                                        <Eye className="h-3 w-3 mr-1" /> View
                                      </Button>
                                    </a>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-xs"
                                      onClick={() => handleRemoveDocFile(doc.documentTypeId, "back")}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <label className="border-2 border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-colors rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer h-36 text-center">
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={(e) => handleDocFileUpload(doc.documentTypeId, "back", e)}
                                    disabled={isBackUploading}
                                  />
                                  {isBackUploading ? (
                                    <div className="flex flex-col items-center gap-1.5">
                                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                      <span className="text-[11px] text-muted-foreground">Uploading back side...</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1">
                                      <UploadCloud className="h-5 w-5 text-primary mb-1" />
                                      <span className="text-xs font-semibold text-foreground">Upload Back Side</span>
                                      <span className="text-[10px] text-muted-foreground">JPG, PNG, PDF up to 5MB</span>
                                    </div>
                                  )}
                                </label>
                              )}
                            </div>
                          )}

                          {/* Optional / Alternative PDF Upload */}
                          {doc.requiresPdf && (
                            <div className="space-y-1.5 sm:col-span-2">
                              <span className="text-xs font-semibold text-foreground flex items-center justify-between">
                                <span>PDF Document Document (Alternative / Full)</span>
                                {doc.pdfUrl && <span className="text-[10px] text-green-600 font-medium">Uploaded</span>}
                              </span>

                              {doc.pdfUrl ? (
                                <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <FileIcon className="h-5 w-5 text-primary" />
                                    <span className="text-xs font-medium text-foreground truncate">
                                      PDF Document Attached
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="outline" className="h-7 text-xs">
                                        <Eye className="h-3 w-3 mr-1" /> View PDF
                                      </Button>
                                    </a>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                      onClick={() => handleRemoveDocFile(doc.documentTypeId, "pdf")}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <label className="border border-dashed border-border hover:border-primary/50 bg-background/50 rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) => handleDocFileUpload(doc.documentTypeId, "pdf", e)}
                                    disabled={isPdfUploading}
                                  />
                                  {isPdfUploading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                      <span>Uploading PDF...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="h-4 w-4 text-primary" />
                                      <span>Click to attach PDF document version</span>
                                    </>
                                  )}
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 text-xs text-primary flex items-start gap-2 mt-4">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Documents can also be uploaded, verified, audited, and approved from the Driver Profile Dashboard anytime after initial registration.
                </p>
              </div>
            </CardContent>
          </div>
        )}

        {/* Step 4: Bank & Payout Information */}
        {currentStep === 4 && (
          <div>
            <CardHeader className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    Step 4: Bank & Payout Details {isStripeHosted ? "(Stripe Connect)" : "(Razorpay / Direct Bank)"}
                  </CardTitle>
                </div>
                {isStripeHosted && (
                  <Badge variant={payoutSetup?.isReady ? "default" : "outline"} className={payoutSetup?.isReady ? "bg-green-600 text-white" : ""}>
                    {payoutSetup?.isReady ? "Stripe Active" : "Stripe Express Pending"}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {isStripeHosted
                  ? "This driver is in a Stripe-supported country (e.g. US, Canada, UK). Onboard via Stripe Express for automated payouts."
                  : "Enter payout banking or UPI information. In India, RazorpayX runs automated Penny Drop and VPA verification."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {isStripeHosted && payoutSetup?.onboardingUrl && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>Stripe Connect Express Onboarding</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stripe handles secure bank detail collection, KYC, and direct deposits. You can open or share the onboarding link with the driver:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <a href={payoutSetup.onboardingUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" type="button" className="w-full gap-2 cursor-pointer">
                        <ExternalLink className="h-4 w-4" /> Open Stripe Express Onboarding
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      className="gap-2 cursor-pointer"
                      onClick={() => handleCopyStripeLink(payoutSetup.onboardingUrl)}
                    >
                      {copiedLink ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      {copiedLink ? "Copied" : "Copy Link"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {isStripeHosted ? "Direct Bank Details (Optional Record)" : "Bank Account Details"}
                  </span>
                  {!isStripeHosted && (
                    <span className="text-[11px] text-muted-foreground">Automated verification via RazorpayX</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="accName">Account Holder Name</Label>
                    <Input
                      id="accName"
                      placeholder={formData.name || "Legal Name on Account"}
                      value={formData.accountHolderName}
                      onChange={(e) => handleChange("accountHolderName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      placeholder="e.g. Chase / HDFC / RBC"
                      value={formData.bankName}
                      onChange={(e) => handleChange("bankName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="accNo">Account Number / IBAN</Label>
                    <Input
                      id="accNo"
                      placeholder="e.g. 918274619284"
                      value={formData.accountNumber}
                      onChange={(e) => handleChange("accountNumber", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="routingCode">Routing / IFSC / SWIFT Code</Label>
                    <Input
                      id="routingCode"
                      placeholder="e.g. HDFC0001234"
                      value={formData.routingCode}
                      onChange={(e) => handleChange("routingCode", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Step 5: Review & Final Submission */}
        {currentStep === 5 && (
          <div>
            <CardHeader className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Step 5: Review Application</CardTitle>
              </div>
              <CardDescription>
                Verify all details, driver photo, and uploaded documents before finalizing the onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Personal summary with Avatar */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3 sm:col-span-2">
                  <div className="flex justify-between items-center font-semibold text-foreground">
                    <span>Personal Profile</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-primary"
                      onClick={() => setCurrentStep(1)}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-primary/30 bg-card shrink-0 flex items-center justify-center font-bold text-primary text-xl">
                      {formData.profilePhoto ? (
                        <img src={formData.profilePhoto} alt="Driver Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-7 w-7 text-primary/40" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{formData.name || "Unnamed Driver"}</p>
                      <p className="text-muted-foreground"><span className="font-medium">Phone:</span> {formData.phone || "N/A"}</p>
                      <p className="text-muted-foreground"><span className="font-medium">Email:</span> {formData.email || "N/A"}</p>
                      <p className="text-muted-foreground"><span className="font-medium">Gender:</span> {formData.gender}</p>
                    </div>
                  </div>
                </div>

                {/* Location summary */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Operating Location
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-primary cursor-pointer"
                      onClick={() => setCurrentStep(1)}
                    >
                      Edit
                    </Button>
                  </div>
                  <p>
                    <span className="text-muted-foreground">Country:</span>{" "}
                    {countries.find((c) => c.id === formData.countryId)?.name || "Not selected"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">State:</span>{" "}
                    {states.find((s) => s.id === formData.stateId)?.name || "N/A"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">City / Hub:</span>{" "}
                    {cities.find((ct) => ct.id === formData.cityId)?.name || "N/A"}
                  </p>
                </div>

                {/* Vehicle summary */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-foreground">
                    <span>Vehicle Info</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-primary"
                      onClick={() => setCurrentStep(2)}
                    >
                      Edit
                    </Button>
                  </div>
                  <p><span className="text-muted-foreground">Plate:</span> {formData.registrationNumber || "N/A"}</p>
                  <p><span className="text-muted-foreground">Year:</span> {formData.year}</p>
                  <p><span className="text-muted-foreground">Color:</span> {formData.color || "Standard"}</p>
                  <p><span className="text-muted-foreground">Vehicle Photo:</span> {formData.image ? "Uploaded ✅" : "None"}</p>
                </div>

                {/* Document verification summary */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 sm:col-span-2">
                  <div className="flex justify-between items-center font-semibold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-primary" />
                      Uploaded Documents & Compliance
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-primary"
                      onClick={() => setCurrentStep(3)}
                    >
                      Edit
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {Object.values(docsState).map((doc) => {
                      const hasFiles = doc.frontUrl || doc.backUrl || doc.pdfUrl;
                      return (
                        <div key={doc.documentTypeId} className="p-2.5 rounded-lg border border-border bg-card/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{doc.name || doc.code}</span>
                            {hasFiles ? (
                              <Badge className="bg-green-600/15 text-green-700 dark:text-green-400 text-[10px] py-0">
                                Uploaded ✅
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground py-0">
                                Pending
                              </Badge>
                            )}
                          </div>
                          {doc.documentNumber && (
                            <p className="text-muted-foreground text-[11px]">
                              <span>Number:</span> {doc.documentNumber}
                            </p>
                          )}
                          {doc.expiryDate && (
                            <p className="text-muted-foreground text-[11px]">
                              <span>Expires:</span> {doc.expiryDate}
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            {doc.frontUrl && (
                              <a href={doc.frontUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">
                                Front Photo
                              </a>
                            )}
                            {doc.backUrl && (
                              <a href={doc.backUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">
                                Back Photo
                              </a>
                            )}
                            {doc.pdfUrl && (
                              <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">
                                PDF Doc
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bank summary */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 sm:col-span-2">
                  <div className="flex justify-between items-center font-semibold text-foreground">
                    <span>Payout Banking</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-primary"
                      onClick={() => setCurrentStep(4)}
                    >
                      Edit
                    </Button>
                  </div>
                  <p><span className="text-muted-foreground">Bank:</span> {formData.bankName || "Not configured"}</p>
                  <p><span className="text-muted-foreground">Account:</span> {formData.accountNumber ? `••••${formData.accountNumber.slice(-4)}` : "None"}</p>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="p-4 sm:p-6 border-t border-border bg-muted/10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1 || isSaving}
            className="text-xs h-9"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {driverId && currentStep < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAndExit}
                disabled={isSaving}
                className="text-xs h-9 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Save & Exit
              </Button>
            )}

            {currentStep < 5 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                disabled={isSaving}
                className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Next
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isSaving}
                className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-semibold px-5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Completing Application...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Finish & Complete Registration
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
