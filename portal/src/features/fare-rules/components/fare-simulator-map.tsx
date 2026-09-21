import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  Loader2,
  AlertCircle,
  Flag,
  Sparkles,
} from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/google-maps";

interface Point {
  lat: number;
  lng: number;
  address?: string;
}

interface FareSimulatorMapProps {
  pickup: Point | null;
  dropoff: Point | null;
  onPickupChange: (point: Point | null) => void;
  onDropoffChange: (point: Point | null) => void;
  onRouteCalculated?: (distanceKm: number, durationMin: number) => void;
}

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
];

const lightMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bae6fd" }] },
];

export function FareSimulatorMap({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onRouteCalculated,
}: FareSimulatorMapProps) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePinMode, setActivePinMode] = useState<"pickup" | "dropoff">("pickup");
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    if (window.google?.maps?.Map) {
      setMapLoaded(true);
      return;
    }
    loadGoogleMapsScript()
      .then(() => setMapLoaded(true))
      .catch(() => setLoadError("Failed to load Google Maps script."));
  }, []);

  const clearAllPoints = () => {
    if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
    if (dropoffMarkerRef.current) dropoffMarkerRef.current.setMap(null);
    if (directionsRendererRef.current) directionsRendererRef.current.setDirections({ routes: [] });
    pickupMarkerRef.current = null;
    dropoffMarkerRef.current = null;
    onPickupChange(null);
    onDropoffChange(null);
    setRouteInfo(null);
    setActivePinMode("pickup");
  };

  const calculateAndDisplayRoute = useCallback(
    (start: Point, end: Point) => {
      if (!window.google?.maps?.DirectionsService || !mapInstanceRef.current) return;

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: new window.google.maps.LatLng(start.lat, start.lng),
          destination: new window.google.maps.LatLng(end.lat, end.lng),
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            if (!directionsRendererRef.current) {
              directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: mapInstanceRef.current,
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: "#3b82f6",
                  strokeWeight: 5,
                  strokeOpacity: 0.85,
                },
              });
            }
            directionsRendererRef.current.setDirections(result);

            const leg = result.routes[0]?.legs[0];
            if (leg) {
              const distKm = parseFloat(((leg.distance?.value || 0) / 1000).toFixed(2));
              const durMin = Math.round((leg.duration?.value || 0) / 60);
              setRouteInfo({ distanceKm: distKm, durationMin: durMin });
              onRouteCalculated?.(distKm, durMin);
            }
          }
        }
      );
    },
    [onRouteCalculated]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !containerEl || !window.google?.maps?.Map) return;

    const isDarkMode = document.documentElement.classList.contains("dark");
    const defaultCenter = pickup || { lat: 12.9716, lng: 77.5946 }; // Default Bengaluru / India

    const map = new window.google.maps.Map(containerEl, {
      center: defaultCenter,
      zoom: 12,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: isDarkMode ? darkMapStyles : lightMapStyles,
    });

    mapInstanceRef.current = map;

    // Click handler for pinning
    map.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      if (activePinMode === "pickup") {
        onPickupChange({ lat, lng });
        setActivePinMode("dropoff");
      } else {
        onDropoffChange({ lat, lng });
      }
    });

    // Places autocomplete
    if (searchInputRef.current && window.google?.maps?.places?.Autocomplete) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "formatted_address", "name"],
      });
      autocomplete.bindTo("bounds", map);

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;

        const loc = place.geometry.location;
        const pt = { lat: loc.lat(), lng: loc.lng(), address: place.formatted_address || place.name };

        map.panTo(loc);
        map.setZoom(14);

        if (activePinMode === "pickup") {
          onPickupChange(pt);
          setActivePinMode("dropoff");
        } else {
          onDropoffChange(pt);
        }
      });
    }
  }, [mapLoaded, containerEl]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Pickup Marker
    if (pickup) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new window.google.maps.Marker({
          position: pickup,
          map: mapInstanceRef.current,
          title: "Pickup Point (A)",
          draggable: true,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2.5,
          },
          label: {
            text: "A",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "bold",
          },
        });

        pickupMarkerRef.current.addListener("dragend", (e: any) => {
          onPickupChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      } else {
        pickupMarkerRef.current.setPosition(pickup);
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setMap(null);
      pickupMarkerRef.current = null;
    }

    // Dropoff Marker
    if (dropoff) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = new window.google.maps.Marker({
          position: dropoff,
          map: mapInstanceRef.current,
          title: "Drop-off Point (B)",
          draggable: true,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2.5,
          },
          label: {
            text: "B",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "bold",
          },
        });

        dropoffMarkerRef.current.addListener("dragend", (e: any) => {
          onDropoffChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      } else {
        dropoffMarkerRef.current.setPosition(dropoff);
      }
    } else if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setMap(null);
      dropoffMarkerRef.current = null;
    }

    // Recalculate Route if both points exist
    if (pickup && dropoff) {
      calculateAndDisplayRoute(pickup, dropoff);
    } else if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
      setRouteInfo(null);
    }
  }, [pickup, dropoff, calculateAndDisplayRoute, onPickupChange, onDropoffChange]);

  const loadSampleTrip = () => {
    // Sample: Bengaluru MG Road -> Airport (approx 34km)
    onPickupChange({ lat: 12.9754, lng: 77.6067, address: "MG Road, Bengaluru" });
    onDropoffChange({ lat: 13.1986, lng: 77.7066, address: "BLR Airport (KIA)" });
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-border shadow-md bg-card">
      {/* Top Search & Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-card/95 backdrop-blur-md p-1.5 rounded-lg border border-border shadow-lg">
          <Search className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
          <Input
            ref={searchInputRef}
            placeholder="Search address or landmark..."
            className="border-none shadow-none h-8 text-xs focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md p-1 rounded-lg border border-border shadow-lg">
          <Button
            type="button"
            variant={activePinMode === "pickup" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePinMode("pickup")}
            className="h-8 text-xs gap-1 cursor-pointer font-medium"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            Pin Pickup (A)
          </Button>

          <Button
            type="button"
            variant={activePinMode === "dropoff" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePinMode("dropoff")}
            className="h-8 text-xs gap-1 cursor-pointer font-medium"
          >
            <Flag className="h-3.5 w-3.5 text-rose-400" />
            Pin Drop-off (B)
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadSampleTrip}
            className="h-8 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
            title="Load sample airport trip"
          >
            <Sparkles className="h-3.5 w-3.5" /> Sample Trip
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearAllPoints}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reset Map Pins"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs z-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading Google Maps simulator...</p>
        </div>
      )}

      {loadError && (
        <div className="absolute top-16 left-4 right-4 z-20 bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Map Element */}
      <div ref={setContainerEl} className="w-full h-full" />

      {/* Bottom Route Summary Float */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        {routeInfo ? (
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-2.5 shadow-lg text-xs flex items-center gap-4 pointer-events-auto">
            <div className="flex items-center gap-1.5 text-foreground font-bold">
              <Navigation className="h-4 w-4 text-primary" />
              <span>{routeInfo.distanceKm} km</span>
            </div>
            <div className="h-3 w-[1px] bg-border" />
            <div className="text-muted-foreground font-medium">
              Duration: <span className="text-foreground font-semibold">~{routeInfo.durationMin} mins</span>
            </div>
          </div>
        ) : (
          <div className="bg-card/90 backdrop-blur-md border border-border/80 rounded-md px-3 py-1.5 shadow-md text-xs text-muted-foreground flex items-center gap-1.5 pointer-events-auto">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Click on map to place Point A (Pickup) and Point B (Dropoff)
          </div>
        )}
      </div>

      {/* Pin Status Legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-card/95 backdrop-blur-md border border-border rounded-lg px-3 py-1.5 shadow-lg text-xs flex items-center gap-3">
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          {pickup ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : "Pickup (Not set)"}
        </div>
        <div className="h-3 w-[1px] bg-border" />
        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          {dropoff ? `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}` : "Drop-off (Not set)"}
        </div>
      </div>
    </div>
  );
}
