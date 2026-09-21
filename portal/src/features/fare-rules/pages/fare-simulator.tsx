import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calculator,
  Play,
  MapPin,
  Tag,
  Sparkles,
  ShieldCheck,
  Layers,
  Flame,
  Plane,
  Receipt,
  Coins,
  Copy,
  Check,
  ArrowRightLeft,
  Clock,
  Navigation,
  FileCode2,
  Percent,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import API from "@/lib/api";
import toast from "react-hot-toast";
import { loadGoogleMapsScript } from "@/lib/google-maps";

interface VehicleType {
  id: string;
  name: string;
  category?: string;
  baseFareMinor?: number;
}

type MapSelectionMode = "pickup" | "dropoff";

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#475569" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
];

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export default function FareSimulatorTab() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [pickupLat, setPickupLat] = useState("12.9716");
  const [pickupLng, setPickupLng] = useState("77.5946");
  const [dropLat, setDropLat] = useState("13.1986");
  const [dropLng, setDropLng] = useState("77.7066");
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "breakdown" | "rateCard" | "zones" | "surge" | "taxes" | "raw"
  >("breakdown");
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectionMode, setSelectionMode] = useState<MapSelectionMode>("pickup");

  // Load Vehicle Types
  useEffect(() => {
    API.get<{ MESSAGE: VehicleType[] }>("/vehicle-types?limit=50")
      .then((res: any) => {
        const types = res.data?.MESSAGE || [];
        setVehicleTypes(types);
        if (types.length > 0 && !selectedVehicleType) {
          setSelectedVehicleType(types[0].id);
        }
      })
      .catch(() => {});
  }, [selectedVehicleType]);

  // Load Google Maps Script
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setMapLoaded(true))
      .catch((err) => console.error("Google Maps load failed:", err));
  }, []);

  // Update pickup marker on map
  const updatePickupMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (!pickupMarkerRef.current) {
      pickupMarkerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: "Pickup Location (Drag to adjust)",
        draggable: true,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#10b981", // Emerald 500
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      pickupMarkerRef.current.addListener("dragend", (e: any) => {
        const pLat = e.latLng.lat().toFixed(6);
        const pLng = e.latLng.lng().toFixed(6);
        setPickupLat(pLat);
        setPickupLng(pLng);
      });
    } else {
      pickupMarkerRef.current.setPosition({ lat, lng });
    }
  }, []);

  // Update dropoff marker on map
  const updateDropMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (!dropMarkerRef.current) {
      dropMarkerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: "Drop-off Location (Drag to adjust)",
        draggable: true,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#ef4444", // Red 500
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      dropMarkerRef.current.addListener("dragend", (e: any) => {
        const dLat = e.latLng.lat().toFixed(6);
        const dLng = e.latLng.lng().toFixed(6);
        setDropLat(dLat);
        setDropLng(dLng);
      });
    } else {
      dropMarkerRef.current.setPosition({ lat, lng });
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current || !window.google?.maps)
      return;

    const initialLat = parseFloat(pickupLat) || 12.9716;
    const initialLng = parseFloat(pickupLng) || 77.5946;
    const isDark = document.documentElement.classList.contains("dark");

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 12,
      styles: isDark ? darkMapStyles : [],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Handle map click for location selection
    map.addListener("click", (e: any) => {
      const lat = e.latLng.lat().toFixed(6);
      const lng = e.latLng.lng().toFixed(6);

      setSelectionMode((prevMode) => {
        if (prevMode === "pickup") {
          setPickupLat(lat);
          setPickupLng(lng);
          updatePickupMarker(parseFloat(lat), parseFloat(lng));
          toast.success("Pickup location pinned! Now click to set Drop-off.");
          return "dropoff";
        } else {
          setDropLat(lat);
          setDropLng(lng);
          updateDropMarker(parseFloat(lat), parseFloat(lng));
          toast.success("Drop-off location pinned!");
          return "pickup";
        }
      });
    });

    // Create initial markers
    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropLat);
    const dLng = parseFloat(dropLng);

    if (!isNaN(pLat) && !isNaN(pLng)) updatePickupMarker(pLat, pLng);
    if (!isNaN(dLat) && !isNaN(dLng)) updateDropMarker(dLat, dLng);

    // Auto-fit bounds
    if (!isNaN(pLat) && !isNaN(dLat)) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: pLat, lng: pLng });
      bounds.extend({ lat: dLat, lng: dLng });
      map.fitBounds(bounds, 60);
    }
  }, [mapLoaded, updatePickupMarker, updateDropMarker]);

  // Sync markers when inputs change
  useEffect(() => {
    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      updatePickupMarker(pLat, pLng);
    }
  }, [pickupLat, pickupLng, updatePickupMarker]);

  useEffect(() => {
    const dLat = parseFloat(dropLat);
    const dLng = parseFloat(dropLng);
    if (!isNaN(dLat) && !isNaN(dLng)) {
      updateDropMarker(dLat, dLng);
    }
  }, [dropLat, dropLng, updateDropMarker]);

  // Render polyline on quote result
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    if (quoteResult?.polyline) {
      const path = decodePolyline(quoteResult.polyline);
      if (path.length > 0) {
        routePolylineRef.current = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#3b82f6", // Blue 500
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map: mapInstanceRef.current,
        });

        // Fit bounds to polyline
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(pt));
        mapInstanceRef.current.fitBounds(bounds, 50);
      }
    }
  }, [quoteResult]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !selectedVehicleType) {
      toast.error("Please fill in pickup, dropoff coordinates and vehicle type");
      return;
    }

    setLoading(true);
    setQuoteResult(null);

    try {
      // 1. Multi-vehicle estimates
      await API.post("/fare/estimate-all", {
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropLat: parseFloat(dropLat),
        dropLng: parseFloat(dropLng),
      }).catch(() => null);

      // 2. Lock-in Quote with breakdown
      const quoteRes = await API.post("/fare/quote", {
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropLat: parseFloat(dropLat),
        dropLng: parseFloat(dropLng),
        vehicleTypeId: selectedVehicleType,
        promoCode: promoCode.trim() ? promoCode.trim().toUpperCase() : undefined,
      });

      if (quoteRes.data?.MESSAGE) {
        setQuoteResult(quoteRes.data.MESSAGE);
        toast.success("Fare simulated successfully!");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to simulate fare");
    } finally {
      setLoading(false);
    }
  };

  const handleSwapLocations = () => {
    const curPLat = pickupLat;
    const curPLng = pickupLng;
    setPickupLat(dropLat);
    setPickupLng(dropLng);
    setDropLat(curPLat);
    setDropLng(curPLng);
    toast.success("Swapped pickup and destination!");
  };

  const setPresetAirportRoute = () => {
    setPickupLat("12.9716"); // Bangalore CBD
    setPickupLng("77.5946");
    setDropLat("13.1986"); // Bangalore Airport (BLR)
    setDropLng("77.7066");
    if (mapInstanceRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: 12.9716, lng: 77.5946 });
      bounds.extend({ lat: 13.1986, lng: 77.7066 });
      mapInstanceRef.current.fitBounds(bounds, 60);
    }
  };

  const setPresetDowntownRoute = () => {
    setPickupLat("12.9352"); // Koramangala
    setPickupLng("77.6245");
    setDropLat("12.9784"); // Indiranagar
    setDropLng("77.6408");
    if (mapInstanceRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: 12.9352, lng: 77.6245 });
      bounds.extend({ lat: 12.9784, lng: 77.6408 });
      mapInstanceRef.current.fitBounds(bounds, 60);
    }
  };

  const setPresetKolkataRoute = () => {
    setPickupLat("22.5726"); // Park Street, Kolkata
    setPickupLng("88.3639");
    setDropLat("22.6547"); // CCU Airport
    setDropLng("88.4467");
    if (mapInstanceRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: 22.5726, lng: 88.3639 });
      bounds.extend({ lat: 22.6547, lng: 88.4467 });
      mapInstanceRef.current.fitBounds(bounds, 60);
    }
  };

  const handleCopyRaw = () => {
    if (!quoteResult) return;
    navigator.clipboard.writeText(JSON.stringify(quoteResult, null, 2));
    setCopiedRaw(true);
    toast.success("Copied complete quote snapshot to clipboard!");
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Preset Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Interactive Fare Engine Simulator</h3>
            <p className="text-xs text-muted-foreground">
              Select trip points on the interactive map, run the complete 11-stage pricing engine, and inspect all financial &amp; spatial data.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setPresetDowntownRoute}
            className="text-xs h-8 cursor-pointer"
          >
            Downtown Route
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setPresetAirportRoute}
            className="text-xs h-8 cursor-pointer"
          >
            BLR Airport Route
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setPresetKolkataRoute}
            className="text-xs h-8 cursor-pointer"
          >
            Kolkata Airport Route
          </Button>
        </div>
      </div>

      {/* Main Grid: Input Form + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form Controls */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Play className="h-4 w-4 text-primary" /> Trip &amp; Vehicle Setup
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSwapLocations}
              className="h-7 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
              title="Swap pickup & destination"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Swap
            </Button>
          </div>

          <form onSubmit={handleSimulate} className="space-y-4 text-xs">
            {/* Map Mode Picker Toggle */}
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-primary" /> Map Click Action
                </span>
                <Badge
                  variant={selectionMode === "pickup" ? "default" : "secondary"}
                  className="text-[10px] py-0 px-2 uppercase font-mono"
                >
                  {selectionMode === "pickup" ? "Setting Pickup" : "Setting Drop-off"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant={selectionMode === "pickup" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectionMode("pickup")}
                  className={`h-7 text-xs font-medium cursor-pointer ${
                    selectionMode === "pickup"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-emerald-600/30 text-emerald-600"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1" /> 🟢 Pickup Pin
                </Button>
                <Button
                  type="button"
                  variant={selectionMode === "dropoff" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectionMode("dropoff")}
                  className={`h-7 text-xs font-medium cursor-pointer ${
                    selectionMode === "dropoff"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "border-red-600/30 text-red-600"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1" /> 🔴 Drop-off Pin
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Tip: Click anywhere on the map or drag the markers to update coordinates in real time.
              </p>
            </div>

            {/* Pickup Coordinates */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Pickup Coordinates (Lat, Lng)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Lat"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
                <Input
                  placeholder="Lng"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
              </div>
            </div>

            {/* Drop Coordinates */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-red-500" /> Drop-off Coordinates (Lat, Lng)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Lat"
                  value={dropLat}
                  onChange={(e) => setDropLat(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
                <Input
                  placeholder="Lng"
                  value={dropLng}
                  onChange={(e) => setDropLng(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
              </div>
            </div>

            {/* Vehicle Category */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground">Vehicle Category</Label>
              <select
                value={selectedVehicleType}
                onChange={(e) => setSelectedVehicleType(e.target.value)}
                className="w-full flex h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground ring-offset-background"
                required
              >
                {vehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name} {vt.category ? `(${vt.category})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Promo Code */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 font-semibold text-foreground">
                <Tag className="h-3.5 w-3.5 text-primary" /> Promo / Coupon Code (Optional)
              </Label>
              <Input
                placeholder="e.g. WELCOME50, AIRPORT10"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="font-mono uppercase text-xs h-8"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs cursor-pointer gap-2"
            >
              <Sparkles className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Simulating 11 Engine Stages..." : "Calculate & Generate Quote"}
            </Button>
          </form>
        </div>

        {/* Right Column: Interactive Map Canvas */}
        <div className="lg:col-span-8 rounded-xl border border-border bg-card p-2 shadow-sm flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">Interactive Route &amp; Point Picker</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Pickup
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Drop-off
              </span>
              {quoteResult?.polyline && (
                <span className="flex items-center gap-1 font-medium text-blue-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Route Computed
                </span>
              )}
            </div>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[400px] lg:h-full min-h-[400px] rounded-lg overflow-hidden bg-muted/20"
          />
        </div>
      </div>

      {/* Results & Complete Engine Data Section */}
      {quoteResult && (() => {
        const currencyCode = quoteResult.currency || quoteResult.currencyCode || "INR";

        const formatMoney = (minor: number) => {
          const amount = (minor || 0) / 100;
          try {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: currencyCode,
            }).format(amount);
          } catch {
            const symbol = quoteResult.currencySymbol || currencyCode;
            return `${symbol} ${amount.toFixed(2)}`;
          }
        };

        // Rider Payable
        const riderFareMinor =
          quoteResult.totalMinor ??
          quoteResult.estimatedFareMinor ??
          (quoteResult.estimatedFare ? Math.round(quoteResult.estimatedFare * 100) : 0);

        // Gross trip fare (before discount)
        const grossFareMinor =
          quoteResult.originalEstimatedFareMinor ??
          quoteResult.subtotalMinor ??
          riderFareMinor;

        // Promo Discount
        const promoDiscountMinor =
          quoteResult.discountAmountMinor ??
          quoteResult.promoDiscountMinor ??
          0;

        // Breakdown subsections
        const bd = quoteResult.breakdown || {};
        const rc = bd.rateCard || {};
        const metered = bd.metered || {};
        const surge = bd.surge || {};
        const zones = bd.zones || {};
        const surcharges = bd.surcharges || {};
        const taxes = bd.taxes || {};

        // Commission Breakdown
        const commission = bd.commission || {};
        const platformCommissionMinor =
          quoteResult.platformCommissionMinor ??
          commission.platformCommissionMinor ??
          0;
        const commissionPercentage =
          quoteResult.commissionPercentage ??
          commission.commissionPercentage ??
          (commission.commissionRate ? (parseFloat(commission.commissionRate) * 100).toFixed(1) : "15.0");

        // Platform Fixed Fees
        const bookingFeeMinor =
          quoteResult.bookingFeeMinor ??
          bd.fees?.bookingFeeMinor ??
          0;
        const platformFeeMinor =
          quoteResult.platformFeeMinor ??
          bd.fees?.serviceFeeMinor ??
          0;
        const totalPlatformFeeMinor =
          platformCommissionMinor + bookingFeeMinor + platformFeeMinor;

        // Driver Net Earnings
        const driverEarningsMinor =
          quoteResult.driverEarningMinor ??
          commission.driverEarningMinor ??
          Math.max(0, grossFareMinor - totalPlatformFeeMinor);

        // Trip stats
        const distanceKm = quoteResult.distanceKm ?? 0;
        const durationMin = quoteResult.durationMin ?? quoteResult.durationMinutes ?? 0;
        const durationInTrafficMin =
          quoteResult.durationInTrafficMin ?? durationMin;
        const trafficDelay = Math.max(0, durationInTrafficMin - durationMin);

        // Itemized fares
        const baseFareMinor =
          quoteResult.baseFareMinor ?? metered.baseFareMinor ?? 0;
        const distanceFareMinor =
          quoteResult.distanceFareMinor ?? metered.distanceFareMinor ?? 0;
        const timeFareMinor =
          quoteResult.timeFareMinor ?? metered.timeFareMinor ?? 0;
        const surgeAmountMinor =
          quoteResult.surgeAmountMinor ?? surge.surgeAmountMinor ?? 0;
        const surgeMultiplier =
          quoteResult.surgeMultiplier ?? surge.surgeMultiplier ?? 1;
        const nightSurchargeMinor =
          quoteResult.nightSurchargeMinor ?? surcharges.nightSurchargeMinor ?? 0;
        const peakSurchargeMinor =
          quoteResult.peakSurchargeMinor ?? surcharges.peakSurchargeMinor ?? 0;
        const airportFeeMinor =
          quoteResult.airportFeeMinor ?? surcharges.airportFeeMinor ?? 0;
        const tollFeeMinor =
          quoteResult.tollAmountMinor ?? surcharges.tollAmountMinor ?? 0;
        const pickupFeeMinor = surcharges.pickupFeeMinor ?? 0;
        const dropoffFeeMinor = surcharges.dropoffFeeMinor ?? 0;
        const taxAmountMinor =
          quoteResult.taxAmountMinor ?? taxes.totalTaxMinor ?? 0;

        return (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
            {/* Header with Quote ID & Validity */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h4 className="font-bold text-base text-foreground">
                  Fare Engine Execution &amp; Complete Breakdown
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs py-0.5">
                  Quote ID: {quoteResult.quoteId || quoteResult.id}
                </Badge>
                <Badge variant="secondary" className="text-xs py-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Valid for {quoteResult.validForSeconds || 600}s
                </Badge>
              </div>
            </div>

            {/* Top 4 Financial Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">
                  Rider Final Payable
                </span>
                <span className="text-2xl font-black text-primary block">
                  {formatMoney(riderFareMinor)}
                </span>
                {promoDiscountMinor > 0 && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                    Saved {formatMoney(promoDiscountMinor)} via coupon
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">
                  Driver Net Trip Earnings
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
                  {formatMoney(driverEarningsMinor)}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Net payout after {commissionPercentage}% cut
                </span>
              </div>

              <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">
                  Platform Cut &amp; Fees
                </span>
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400 block">
                  {formatMoney(totalPlatformFeeMinor)}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {commissionPercentage}% Commission ({formatMoney(platformCommissionMinor)})
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">
                  Marketing Promo Subsidy
                </span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">
                  {formatMoney(promoDiscountMinor)}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Absorbed by Platform (Zero Driver Cut)
                </span>
              </div>
            </div>

            {/* Quick Trip Route Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border border-border text-xs">
              <div>
                <span className="text-muted-foreground block">Route Distance</span>
                <span className="font-semibold text-foreground">{distanceKm.toFixed(2)} km</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Estimated Duration</span>
                <span className="font-semibold text-foreground">
                  {durationInTrafficMin} mins {trafficDelay > 0 ? `(+${trafficDelay}m traffic)` : ""}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Vehicle Class</span>
                <span className="font-semibold text-foreground">{quoteResult.vehicleTypeName || "Standard"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Pricing Plan Version</span>
                <span className="font-semibold text-foreground font-mono">
                  v{bd.pricingVersionNumber || 1}
                </span>
              </div>
            </div>

            {/* Deep-dive Navigation Tabs */}
            <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-2">
              <Button
                variant={activeTab === "breakdown" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("breakdown")}
                className="text-xs h-8 cursor-pointer gap-1.5"
              >
                <Receipt className="h-3.5 w-3.5" /> Itemized Breakdown
              </Button>
              <Button
                variant={activeTab === "rateCard" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("rateCard")}
                className="text-xs h-8 cursor-pointer gap-1.5"
              >
                <Coins className="h-3.5 w-3.5" /> Rate Card Config
              </Button>
              <Button
                variant={activeTab === "surge" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("surge")}
                className="text-xs h-8 cursor-pointer gap-1.5"
              >
                <Flame className="h-3.5 w-3.5" /> Dynamic Surge ({surgeMultiplier}x)
              </Button>
              <Button
                variant={activeTab === "zones" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("zones")}
                className="text-xs h-8 cursor-pointer gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" /> Spatial Zones &amp; H3
              </Button>
              <Button
                variant={activeTab === "taxes" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("taxes")}
                className="text-xs h-8 cursor-pointer gap-1.5"
              >
                <Percent className="h-3.5 w-3.5" /> Taxes &amp; Surcharges
              </Button>
              <Button
                variant={activeTab === "raw" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("raw")}
                className="text-xs h-8 cursor-pointer gap-1.5 ml-auto"
              >
                <FileCode2 className="h-3.5 w-3.5" /> Raw Engine JSON
              </Button>
            </div>

            {/* Tab Contents */}

            {/* TAB 1: Itemized Breakdown */}
            {activeTab === "breakdown" && (
              <div className="border border-border rounded-lg overflow-hidden text-xs">
                <div className="divide-y divide-border/60">
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground block">Base Fare (Flag Drop)</span>
                      <span className="text-[11px] text-muted-foreground">Fixed initial booking charge</span>
                    </div>
                    <span className="font-mono font-semibold text-sm">{formatMoney(baseFareMinor)}</span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground block">
                        Distance Fare ({distanceKm.toFixed(2)} km @ {formatMoney(rc.perKmRateMinor || 0)}/km)
                      </span>
                      <span className="text-[11px] text-muted-foreground">Metered GPS route distance</span>
                    </div>
                    <span className="font-mono font-semibold text-sm">{formatMoney(distanceFareMinor)}</span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground block">
                        Duration Fare ({durationInTrafficMin} mins @ {formatMoney(rc.perMinRateMinor || 0)}/min)
                      </span>
                      <span className="text-[11px] text-muted-foreground">Time in traffic metered duration</span>
                    </div>
                    <span className="font-mono font-semibold text-sm">{formatMoney(timeFareMinor)}</span>
                  </div>

                  {surgeAmountMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-rose-500/5">
                      <div>
                        <span className="font-semibold text-rose-600 dark:text-rose-400 block flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5" /> Dynamic Surge Multiplier ({surgeMultiplier}x)
                        </span>
                        <span className="text-[11px] text-rose-500/80">
                          {surge.reason || "Real-time demand/supply imbalance"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                        +{formatMoney(surgeAmountMinor)}
                      </span>
                    </div>
                  )}

                  {nightSurchargeMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-indigo-500/5">
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        🌙 Night Hour Surcharge
                      </span>
                      <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        +{formatMoney(nightSurchargeMinor)}
                      </span>
                    </div>
                  )}

                  {peakSurchargeMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-amber-500/5">
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        ⚡ Peak Rush Hour Multiplier
                      </span>
                      <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                        +{formatMoney(peakSurchargeMinor)}
                      </span>
                    </div>
                  )}

                  {airportFeeMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-blue-500/5">
                      <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5" /> Airport Hub Surcharge
                      </span>
                      <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                        +{formatMoney(airportFeeMinor)}
                      </span>
                    </div>
                  )}

                  {tollFeeMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-purple-500/5">
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        🛣️ Automated Toll Fee
                      </span>
                      <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                        +{formatMoney(tollFeeMinor)}
                      </span>
                    </div>
                  )}

                  {platformCommissionMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-sky-500/5">
                      <div>
                        <span className="font-medium text-sky-700 dark:text-sky-300 block">
                          🏢 Platform Commission ({commissionPercentage}%)
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Platform take-rate deducted from trip earnings
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-sky-700 dark:text-sky-300">
                        {formatMoney(platformCommissionMinor)}
                      </span>
                    </div>
                  )}

                  {taxAmountMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-slate-500/5">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        🏛️ Taxes &amp; Levies ({rc.taxPercentage || "0"}%)
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-600 dark:text-slate-400">
                        +{formatMoney(taxAmountMinor)}
                      </span>
                    </div>
                  )}

                  {promoDiscountMinor > 0 && (
                    <div className="px-4 py-2.5 flex items-center justify-between bg-emerald-500/10">
                      <div>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" /> Promo Discount ({quoteResult.promoCode || promoCode})
                        </span>
                        <span className="text-[11px] text-emerald-600/80">Subsidized by Platform</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                        -{formatMoney(promoDiscountMinor)}
                      </span>
                    </div>
                  )}

                  <div className="px-4 py-3 flex items-center justify-between bg-muted/60 font-bold text-base">
                    <span>Total Rider Payable</span>
                    <span className="font-mono text-primary text-lg">{formatMoney(riderFareMinor)}</span>
                  </div>

                  <div className="px-4 py-3 bg-muted/30 grid grid-cols-2 gap-3 border-t border-border/60">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold block">
                        🚗 Driver Net Payout
                      </span>
                      <span className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {formatMoney(driverEarningsMinor)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                      <span className="text-[11px] text-sky-700 dark:text-sky-400 uppercase font-semibold block">
                        🏢 Platform Cut ({commissionPercentage}%)
                      </span>
                      <span className="text-base font-mono font-bold text-sky-700 dark:text-sky-300">
                        {formatMoney(platformCommissionMinor)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Rate Card Config */}
            {activeTab === "rateCard" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h5 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-primary" /> Active Rate Card Parameters
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Base Fare Flag Drop</span>
                      <span className="font-mono font-semibold">{formatMoney(rc.baseRateMinor || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Per KM Rate</span>
                      <span className="font-mono font-semibold">{formatMoney(rc.perKmRateMinor || 0)} / km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Per Minute Rate</span>
                      <span className="font-mono font-semibold">{formatMoney(rc.perMinRateMinor || 0)} / min</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Minimum Fare Floor</span>
                      <span className="font-mono font-semibold">{formatMoney(rc.minFareMinor || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h5 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-primary" /> Platform Fees &amp; Taxes
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Booking Fee</span>
                      <span className="font-mono font-semibold">{formatMoney(rc.bookingFeeMinor || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Platform Service Fee</span>
                      <span className="font-mono font-semibold">{formatMoney(rc.serviceFeeMinor || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Waiting Price Per Min</span>
                      <span className="font-mono font-semibold">{formatMoney(rc.waitingPricePerMinMinor || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Tax Percentage</span>
                      <span className="font-mono font-semibold">{rc.taxPercentage || "0.00"}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Dynamic Surge Engine */}
            {activeTab === "surge" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Flame className="h-4 w-4 text-rose-500" /> Dynamic Surge Status &amp; Isolations
                    </h5>
                    <Badge variant={surge.isSurging ? "destructive" : "secondary"}>
                      {surge.isSurging ? `${surgeMultiplier}x Surge Active` : "Normal Pricing (1.0x)"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-card border border-border rounded-lg">
                      <span className="text-muted-foreground block text-[11px]">Dynamic Multiplier</span>
                      <span className="text-lg font-bold text-foreground">
                        {surge.dynamicSurgeMultiplier || 1.0}x
                      </span>
                    </div>
                    <div className="p-3 bg-card border border-border rounded-lg">
                      <span className="text-muted-foreground block text-[11px]">Surgeable Base</span>
                      <span className="text-lg font-bold text-foreground">
                        {formatMoney(surge.surgeableBaseMinor || metered.meteredSubtotalMinor || 0)}
                      </span>
                    </div>
                    <div className="p-3 bg-card border border-border rounded-lg">
                      <span className="text-muted-foreground block text-[11px]">Surge Amount</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {formatMoney(surgeAmountMinor)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
                    <span className="font-semibold text-foreground block">Surge Reason</span>
                    <p className="text-muted-foreground">{surge.reason || "Standard supply & demand equilibrium"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Spatial Zones & H3 */}
            {activeTab === "zones" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h5 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" /> Geofence &amp; Airport Detection
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Pickup Zone</span>
                      <span className="font-semibold">{zones.pickupZone?.name || "None / Generic City"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Drop-off Zone</span>
                      <span className="font-semibold">{zones.dropZone?.name || "None / Generic City"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Pickup Airport</span>
                      <span className="font-semibold">{zones.pickupAirport?.name || "None"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Drop-off Airport</span>
                      <span className="font-semibold">{zones.dropAirport?.name || "None"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h5 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" /> Resolved H3 Hexagon Zones
                  </h5>
                  {zones.hexZones && zones.hexZones.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {zones.hexZones.map((hz: any, idx: number) => (
                        <div
                          key={hz.id || idx}
                          className="flex items-center justify-between p-2 bg-card rounded border border-border"
                        >
                          <span className="font-medium">{hz.name || `Hex Zone ${idx + 1}`}</span>
                          <Badge variant="outline" className="text-[10px]">
                            Priority: {hz.priority ?? 0}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No specialized H3 hex overlay active at this point.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: Taxes & Surcharges */}
            {activeTab === "taxes" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h5 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Percent className="h-4 w-4 text-primary" /> Tax Engine Calculation
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Exclusive Tax (Added to Fare)</span>
                      <span className="font-mono font-semibold">{formatMoney(taxes.exclusiveTaxMinor || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Inclusive Tax (Baked in Fare)</span>
                      <span className="font-mono font-semibold">{formatMoney(taxes.inclusiveTaxMinor || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Total Tax Liability</span>
                      <span className="font-mono font-semibold">{formatMoney(taxes.totalTaxMinor || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h5 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-primary" /> Surcharges &amp; Access Fees
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Airport Fee</span>
                      <span className="font-mono font-semibold">{formatMoney(airportFeeMinor)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Toll Fee</span>
                      <span className="font-mono font-semibold">{formatMoney(tollFeeMinor)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Pickup Geofence Fee</span>
                      <span className="font-mono font-semibold">{formatMoney(pickupFeeMinor)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Dropoff Geofence Fee</span>
                      <span className="font-mono font-semibold">{formatMoney(dropoffFeeMinor)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: Raw JSON Snapshot */}
            {activeTab === "raw" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Complete immutable quote payload generated by backend calculation engine:
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyRaw}
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                  >
                    {copiedRaw ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedRaw ? "Copied" : "Copy JSON"}
                  </Button>
                </div>
                <pre className="p-4 bg-muted/60 rounded-lg border border-border font-mono text-[11px] overflow-x-auto max-h-96 text-foreground">
                  {JSON.stringify(quoteResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
