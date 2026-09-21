import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useVehicleModelsLookup, useDriver } from "../hooks";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import { vehiclesApi, driversApi } from "../api";
import { bankDetailsApi } from "@/features/bank-details/api";
import { useDriverPayoutSetup } from "@/features/bank-details/hooks";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, label: "Personal Details", icon: User },
  { id: 2, label: "Vehicle & Photos", icon: Car },
  { id: 3, label: "Document Uploads", icon: FileText },
  { id: 4, label: "Bank & Payouts", icon: Landmark },
  { id: 5, label: "Review & Submit", icon: CheckCircle2 },
];

export default function DriverRegisterWizardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const existingDriverId = searchParams.get("driverId");

  const [currentStep, setCurrentStep] = useState(1);
  const [driverId, setDriverId] = useState<string | null>(existingDriverId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data: vehicleModelsData } = useVehicleModelsLookup();
  const vehicleModels = vehicleModelsData?.MESSAGE ?? [];

  // Cascading Location lookups
  const { data: countriesData, isLoading: isLoadingCountries } = useCountryOptions();
  const countries = countriesData?.MESSAGE ?? [];

  // If editing an existing driver, fetch their profile
  const { data: existingDriverData } = useDriver(driverId || undefined);
  const existingSummary = existingDriverData?.MESSAGE;
  const existingDriver = existingSummary?.driver;
  const existingVehicles = existingSummary?.vehicles ?? [];
  const existingActiveVehicle = existingVehicles.find((v) => v.isActive) || existingVehicles[0];

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
    // Step 1: Personal & Location
    name: "",
    phone: "",
    email: "",
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
        dateOfBirth: existingDriver.dateOfBirth || prev.dateOfBirth,
        gender: existingDriver.gender || prev.gender,
        referralCode: existingDriver.referralCode || prev.referralCode,
        countryId: existingDriver.countryId || prev.countryId,
        stateId: existingDriver.stateId || prev.stateId,
        cityId: existingDriver.cityId || prev.cityId,
        licenseNumber: existingDriver.licenseNumber || prev.licenseNumber,
        aadharNumber: existingDriver.aadharNumber || prev.aadharNumber,
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
      toast.error(err.message || "Failed to upload vehicle photo");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save current step data to database
  const saveStepProgress = async (stepToSave: number): Promise<string | null> => {
    try {
      setIsSaving(true);
      let targetId = driverId;

      // ── Step 1: Save Personal Info ───────────────────────────────────────
      if (stepToSave === 1 || !targetId) {
        if (!formData.name.trim()) {
          toast.error("Please enter the driver's full name");
          return null;
        }
        if (!formData.phone.trim() && !formData.email.trim()) {
          toast.error("Please enter at least a phone number or email");
          return null;
        }

        if (!formData.countryId) {
          toast.error("Please select an operating country (required for vehicle & payout rules in next steps)");
          return null;
        }

        if (!targetId) {
          // Create initial driver record
          const driverRes: any = await driversApi.create({
            name: formData.name,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            gender: formData.gender,
            referralCode: formData.referralCode || undefined,
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
            name: formData.name,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            gender: formData.gender,
            referralCode: formData.referralCode || undefined,
            countryId: formData.countryId || undefined,
            stateId: formData.stateId || undefined,
            cityId: formData.cityId || undefined,
          });
        }
      }

      // ── Step 2: Save Vehicle Info ────────────────────────────────────────
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

      // ── Step 3: Save Document Numbers ────────────────────────────────────
      if (stepToSave === 3 && targetId) {
        await driversApi.update(targetId, {
          licenseNumber: formData.licenseNumber || undefined,
          aadharNumber: formData.aadharNumber || undefined,
        });
      }

      // ── Step 4: Save Bank Details ────────────────────────────────────────
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
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div>
            <CardHeader className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Step 1: Personal Information</CardTitle>
              </div>
              <CardDescription>
                Basic identification and contact information for the driver.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
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

        {/* Step 3: Document Uploads */}
        {currentStep === 3 && (
          <div>
            <CardHeader className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Step 3: Document Verification</CardTitle>
              </div>
              <CardDescription>
                Enter legal license numbers and documentation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="licNo">Driver's License Number</Label>
                  <Input
                    id="licNo"
                    placeholder="e.g. DL-992019482"
                    value={formData.licenseNumber}
                    onChange={(e) => handleChange("licenseNumber", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="aadharNo">National ID / Aadhar Number</Label>
                  <Input
                    id="aadharNo"
                    placeholder="e.g. 5542 1829 0192"
                    value={formData.aadharNumber}
                    onChange={(e) => handleChange("aadharNumber", e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 text-xs text-primary flex items-start gap-2 mt-4">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Documents can also be uploaded, verified, and audited from the Driver Profile Dashboard anytime.
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
                Verify all details before finalizing the driver onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Personal summary */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-foreground">
                    <span>Personal Info</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-primary"
                      onClick={() => setCurrentStep(1)}
                    >
                      Edit
                    </Button>
                  </div>
                  <p><span className="text-muted-foreground">Name:</span> {formData.name}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {formData.phone || "N/A"}</p>
                  <p><span className="text-muted-foreground">Email:</span> {formData.email || "N/A"}</p>
                  <p><span className="text-muted-foreground">Gender:</span> {formData.gender}</p>
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
                  <p><span className="text-muted-foreground">Photo:</span> {formData.image ? "Uploaded ✅" : "None"}</p>
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
