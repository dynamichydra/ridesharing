import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'mock_map_view.dart';

class AppMapView extends StatelessWidget {
  final LatLng? pickup;
  final LatLng? destination;
  final LatLng? driverPosition;
  final double driverBearing;
  final List<LatLng> routePoints;
  final bool useGoogleMaps;

  const AppMapView({
    super.key,
    this.pickup,
    this.destination,
    this.driverPosition,
    this.driverBearing = 0.0,
    this.routePoints = const [],
    this.useGoogleMaps = false, // Default to mock mode for guaranteed compilation and look-and-feel
  });

  @override
  Widget build(BuildContext context) {
    if (useGoogleMaps) {
      return GoogleMap(
        initialCameraPosition: CameraPosition(
          target: driverPosition ?? pickup ?? const LatLng(12.9716, 77.5946),
          zoom: 14.0,
        ),
        markers: {
          if (pickup != null)
            Marker(
              markerId: const MarkerId('pickup'),
              position: pickup!,
              infoWindow: const InfoWindow(title: 'Pickup'),
            ),
          if (destination != null)
            Marker(
              markerId: const MarkerId('destination'),
              position: destination!,
              infoWindow: const InfoWindow(title: 'Destination'),
            ),
          if (driverPosition != null)
            Marker(
              markerId: const MarkerId('driver'),
              position: driverPosition!,
              icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
              rotation: driverBearing,
            ),
        },
        polylines: {
          if (routePoints.isNotEmpty)
            Polyline(
              polylineId: const PolylineId('route'),
              points: routePoints,
              color: Theme.of(context).colorScheme.secondary,
              width: 5,
            ),
        },
      );
    }

    return MockMapView(
      pickup: pickup,
      destination: destination,
      driverPosition: driverPosition,
      driverBearing: driverBearing,
      routePoints: routePoints,
    );
  }
}
