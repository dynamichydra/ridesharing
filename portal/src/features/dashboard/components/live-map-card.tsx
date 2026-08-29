import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Navigation } from "lucide-react";
import type { FleetStatus, LiveMapHeatmapResponse } from "../types";

interface LiveMapCardProps {
  fleetStatus?: FleetStatus;
  heatmapData?: LiveMapHeatmapResponse;
  isLoading?: boolean;
}

declare global {
  interface Window {
    google?: any;
    initGoogleMapCallback?: () => void;
  }
}

// San Francisco default center
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "AIzaSyCa9c3EMWliRd2AUcZA-LpJF7VwhEjsd7g";

// Simulated mock drivers if live drivers list is empty
const MOCK_DRIVERS = [
  { id: "d-1", name: "Sarah Williams", lat: 37.779, lng: -122.418, isOnTrip: true, rating: 4.9, vehicleModel: "Toyota Camry" },
  { id: "d-2", name: "David Chen", lat: 37.765, lng: -122.425, isOnTrip: false, rating: 4.8, vehicleModel: "Honda Accord" },
  { id: "d-3", name: "Marcus Brody", lat: 37.785, lng: -122.405, isOnTrip: true, rating: 5.0, vehicleModel: "Tesla Model 3" },
  { id: "d-4", name: "Elena Rostova", lat: 37.771, lng: -122.435, isOnTrip: false, rating: 4.7, vehicleModel: "Hyundai Ioniq" },
  { id: "d-5", name: "James Carter", lat: 37.792, lng: -122.412, isOnTrip: false, rating: 4.9, vehicleModel: "Ford Fusion" },
];

export function LiveMapCard({ fleetStatus, heatmapData }: LiveMapCardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load Google Maps API Script
  useEffect(() => {
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.getElementById("google-maps-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => setLoadError(true);
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => setMapLoaded(true));
      existingScript.addEventListener("error", () => setLoadError(true));
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !window.google?.maps || mapInstanceRef.current) return;

    try {
      const isDarkMode = document.documentElement.classList.contains("dark");
      
      const darkMapStyles = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
      ];

      const lightMapStyles = [
        { featureType: "all", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#e9edf0" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
      ];

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        styles: isDarkMode ? darkMapStyles : lightMapStyles,
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      mapInstanceRef.current = map;
    } catch (e) {
      console.warn("Failed to initialize Google Map:", e);
      setLoadError(true);
    }
  }, [mapLoaded]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const rawDrivers = heatmapData?.supply?.drivers || [];
    const driversToRender = rawDrivers.length > 0 ? rawDrivers : MOCK_DRIVERS;

    driversToRender.forEach((d) => {
      const isTrip = d.isOnTrip;
      // Driver Marker Icon (SVG)
      const svgIcon = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: isTrip ? "#3b82f6" : "#0b9f53",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      };

      const marker = new window.google.maps.Marker({
        position: { lat: Number(d.lat), lng: Number(d.lng) },
        map: mapInstanceRef.current,
        title: d.name,
        icon: svgIcon,
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        const content = `
          <div style="padding: 6px; font-family: inherit; color: #1e293b;">
            <div style="font-weight: 700; font-size: 14px;">${d.name}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              ${d.vehicleModel || "Vehicle"} • ⭐ ${d.rating || "5.0"}
            </div>
            <div style="margin-top: 4px;">
              <span style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: 600; border-radius: 4px; background: ${isTrip ? '#dbeafe' : '#dcfce7'}; color: ${isTrip ? '#1e40af' : '#166534'};">
                ${isTrip ? "On Trip" : "Idle (Available)"}
              </span>
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Render active ride pickup points
    const ridesToRender = heatmapData?.demand?.rides || [];
    ridesToRender.slice(0, 5).forEach((r) => {
      if (!r.pickupLat || !r.pickupLng) return;
      const rideMarker = new window.google.maps.Marker({
        position: { lat: Number(r.pickupLat), lng: Number(r.pickupLng) },
        map: mapInstanceRef.current,
        title: `Ride: ${r.pickupAddress || "Pickup"}`,
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
          scale: 1.2,
          anchor: new window.google.maps.Point(12, 22),
        },
      });

      markersRef.current.push(rideMarker);
    });
  }, [heatmapData, mapLoaded]);

  const online = fleetStatus?.online ?? 680;
  const onTrip = fleetStatus?.onTrip ?? 452;
  const idle = fleetStatus?.idle ?? 228;
  const offline = fleetStatus?.offline ?? 162;

  return (
    <Card className="border-border bg-card shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">
            Live Dispatch Map
          </CardTitle>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Live Sync
        </Badge>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col relative min-h-[360px]">
        {/* Map Container */}
        <div className="flex-1 w-full h-full min-h-[300px] relative bg-muted/40 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

          {/* Fallback stylized visual map overlay if Google Maps is loading or offline */}
          {(!mapLoaded || loadError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 p-6 text-center">
              <Car className="h-10 w-10 text-primary/40 mb-2 animate-bounce" />
              <p className="text-sm font-medium text-foreground">
                {loadError ? "Google Maps preview mode active" : "Connecting to Google Maps live telemetry…"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Tracking {online} active fleet vehicles across designated service zones.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Real-Time Fleet Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border bg-card divide-x divide-border">
          <div className="p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Online
            </p>
            <p className="text-xl font-bold text-primary mt-0.5">
              {online.toLocaleString()}
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On Trip
            </p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              {onTrip.toLocaleString()}
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Idle
            </p>
            <p className="text-xl font-bold text-muted-foreground mt-0.5">
              {idle.toLocaleString()}
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Offline
            </p>
            <p className="text-xl font-bold text-muted-foreground/70 mt-0.5">
              {offline.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
