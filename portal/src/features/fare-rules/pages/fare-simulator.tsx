import { useState, useEffect } from "react";
import { Calculator, Play, MapPin, Tag, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import API from "@/lib/api";
import toast from "react-hot-toast";

interface VehicleType {
  id: string;
  name: string;
  category?: string;
  baseFareMinor?: number;
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

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !selectedVehicleType) {
      toast.error("Please fill in pickup, dropoff coordinates and vehicle type");
      return;
    }

    setLoading(true);
    setQuoteResult(null);

    try {
      // 1. Get multi-vehicle estimates
      await API.post("/fare/estimate-all", {
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropLat: parseFloat(dropLat),
        dropLng: parseFloat(dropLng),
      }).catch(() => null);

      // 2. Generate specific lock-in Quote with breakdown
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

  const setPresetAirportRoute = () => {
    setPickupLat("12.9716"); // Bangalore CBD
    setPickupLng("77.5946");
    setDropLat("13.1986");  // Bangalore Airport (BLR)
    setDropLng("77.7066");
  };

  const setPresetDowntownRoute = () => {
    setPickupLat("12.9352"); // Koramangala
    setPickupLng("77.6245");
    setDropLat("12.9784");  // Indiranagar
    setDropLng("77.6408");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Interactive Fare Engine Simulator</h3>
            <p className="text-xs text-muted-foreground">
              Simulate dynamic quote generation, night/peak surges, airport surcharges, and promo code subsidies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={setPresetDowntownRoute} className="text-xs h-8">
            Preset: Downtown Short Trip
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={setPresetAirportRoute} className="text-xs h-8">
            Preset: Airport Surcharge Trip
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Input Controls */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 lg:col-span-1">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <Play className="h-4 w-4 text-primary" /> Trip Parameters
          </h4>

          <form onSubmit={handleSimulate} className="space-y-4 text-xs">
            {/* Pickup Coordinates */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Pickup Coordinates
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Lat e.g. 12.9716"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
                <Input
                  placeholder="Lng e.g. 77.5946"
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
                <MapPin className="h-3.5 w-3.5 text-red-500" /> Drop-off Coordinates
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Lat e.g. 13.1986"
                  value={dropLat}
                  onChange={(e) => setDropLat(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
                <Input
                  placeholder="Lng e.g. 77.7066"
                  value={dropLng}
                  onChange={(e) => setDropLng(e.target.value)}
                  className="font-mono text-xs h-8"
                  required
                />
              </div>
            </div>

            {/* Vehicle Type */}
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
                    {vt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Promo Code */}
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
              {loading ? "Calculating Fare Engine..." : "Calculate & Generate Quote"}
            </Button>
          </form>
        </div>

        {/* Results & Financial Breakdown Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
          <h4 className="font-semibold text-sm flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Fare Engine Execution Results
            </span>
            {quoteResult?.quoteId && (
              <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                Quote ID: {quoteResult.quoteId.slice(0, 8)}...
              </span>
            )}
          </h4>

          {!quoteResult && !loading && (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg text-muted-foreground">
              <Calculator className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">Ready to Simulate</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Enter trip coordinates and click &apos;Calculate &amp; Generate Quote&apos; to view full breakdown of base rates, metered distance, night/peak multipliers, airport surcharges, and promo subsidies.
              </p>
            </div>
          )}

          {quoteResult && (
            <div className="space-y-4">
              {/* Top Banner with Big Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/40 rounded-lg border border-border/80 text-center">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Rider Final Fare</span>
                  <span className="text-2xl font-bold text-foreground">
                    {quoteResult.formattedRiderFare || `₹${((quoteResult.riderFareMinor || quoteResult.finalFareMinor || 0) / 100).toFixed(2)}`}
                  </span>
                  {quoteResult.promoDiscountMinor > 0 && (
                    <span className="text-[10px] text-emerald-600 block">
                      Saved ₹{(quoteResult.promoDiscountMinor / 100).toFixed(2)} via promo
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Driver Earnings</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {quoteResult.formattedDriverFare || `₹${((quoteResult.driverFareMinor || quoteResult.grossFareMinor || 0) / 100).toFixed(2)}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">100% full gross base (Unpenalized)</span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Platform Subsidy</span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    ₹{((quoteResult.promoDiscountMinor || 0) / 100).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Absorbed as Marketing Cost</span>
                </div>
              </div>

              {/* Itemized Fare Breakdown Table */}
              <div className="border border-border rounded-lg overflow-hidden text-xs">
                <div className="bg-muted/60 px-3 py-2 font-semibold border-b border-border flex items-center justify-between">
                  <span>Itemized Component Breakdown</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Est. {quoteResult.distanceKm?.toFixed(1) || "-"} km · {quoteResult.durationMinutes || "-"} mins
                  </span>
                </div>

                <div className="divide-y divide-border/60">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Base Fare (Flag Drop)</span>
                    <span className="font-mono font-medium">₹{((quoteResult.baseFareMinor || 0) / 100).toFixed(2)}</span>
                  </div>

                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Distance Charge ({quoteResult.distanceKm?.toFixed(1)} km)</span>
                    <span className="font-mono font-medium">₹{((quoteResult.distanceChargeMinor || 0) / 100).toFixed(2)}</span>
                  </div>

                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Duration Charge ({quoteResult.durationMinutes} min)</span>
                    <span className="font-mono font-medium">₹{((quoteResult.timeChargeMinor || 0) / 100).toFixed(2)}</span>
                  </div>

                  {quoteResult.nightSurchargeMinor > 0 && (
                    <div className="px-3 py-2 flex items-center justify-between bg-indigo-500/5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">🌙 Night Hour Surcharge</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">+₹{(quoteResult.nightSurchargeMinor / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {quoteResult.peakSurchargeMinor > 0 && (
                    <div className="px-3 py-2 flex items-center justify-between bg-amber-500/5">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">⚡ Peak Rush Hour Multiplier</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+₹{(quoteResult.peakSurchargeMinor / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {quoteResult.airportFeeMinor > 0 && (
                    <div className="px-3 py-2 flex items-center justify-between bg-blue-500/5">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">✈️ Airport Hub Surcharge</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">+₹{(quoteResult.airportFeeMinor / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {quoteResult.tollFeeMinor > 0 && (
                    <div className="px-3 py-2 flex items-center justify-between bg-purple-500/5">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">🛣️ Automated Toll Fee</span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">+₹{(quoteResult.tollFeeMinor / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {quoteResult.promoDiscountMinor > 0 && (
                    <div className="px-3 py-2 flex items-center justify-between bg-emerald-500/10 font-semibold">
                      <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Tag className="h-3 w-3" /> Promo Code Applied ({quoteResult.promoCode || promoCode})
                      </span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300">-₹{(quoteResult.promoDiscountMinor / 100).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="px-3 py-2 flex items-center justify-between bg-muted/40 font-bold text-sm">
                    <span>Total Rider Payable</span>
                    <span className="font-mono text-primary">
                      {quoteResult.formattedRiderFare || `₹${((quoteResult.riderFareMinor || quoteResult.finalFareMinor || 0) / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
