import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class DriverMapView extends StatefulWidget {
  final LatLng? pickup;
  final LatLng? destination;
  final LatLng? driverPosition;
  final double driverBearing;
  final List<LatLng> traveledPath;
  final List<LatLng> routePoints;
  final Function(GoogleMapController)? onMapCreated;

  const DriverMapView({
    super.key,
    this.pickup,
    this.destination,
    this.driverPosition,
    this.driverBearing = 0.0,
    this.traveledPath = const [],
    this.routePoints = const [],
    this.onMapCreated,
  });

  @override
  State<DriverMapView> createState() => _DriverMapViewState();
}

class _DriverMapViewState extends State<DriverMapView> {
  GoogleMapController? _mapController;

  bool _isValidLatLng(LatLng? pos) {
    if (pos == null) return false;
    if (pos.latitude == 0.0 && pos.longitude == 0.0) return false;
    return pos.latitude >= -90.0 &&
        pos.latitude <= 90.0 &&
        pos.longitude >= -180.0 &&
        pos.longitude <= 180.0;
  }

  @override
  void didUpdateWidget(covariant DriverMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.driverPosition != null &&
        _isValidLatLng(widget.driverPosition) &&
        widget.driverPosition != oldWidget.driverPosition &&
        _mapController != null &&
        mounted) {
      try {
        _mapController?.animateCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(
              target: widget.driverPosition!,
              zoom: 16.0,
              bearing: widget.driverBearing,
            ),
          ),
        );
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    const defaultPos = LatLng(22.5726, 88.3639);
    final initialPos = _isValidLatLng(widget.driverPosition)
        ? widget.driverPosition!
        : (_isValidLatLng(widget.pickup) ? widget.pickup! : defaultPos);

    return GoogleMap(
      onMapCreated: (controller) {
        _mapController = controller;
        widget.onMapCreated?.call(controller);
      },
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
      compassEnabled: true,
      initialCameraPosition: CameraPosition(
        target: initialPos,
        zoom: 16.0,
        bearing: widget.driverBearing,
      ),
      markers: {
        if (widget.pickup != null)
          Marker(
            markerId: const MarkerId('pickup'),
            position: widget.pickup!,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueGreen,
            ),
            infoWindow: const InfoWindow(title: 'Pickup Location'),
            zIndexInt: 3,
          ),
        if (widget.destination != null)
          Marker(
            markerId: const MarkerId('destination'),
            position: widget.destination!,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueRed,
            ),
            infoWindow: const InfoWindow(title: 'Drop Location'),
            zIndexInt: 3,
          ),
        if (widget.driverPosition != null)
          Marker(
            markerId: const MarkerId('driver_car'),
            position: widget.driverPosition!,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueAzure,
            ),
            rotation: widget.driverBearing,
            flat: true,
            anchor: const Offset(0.5, 0.5),
            zIndexInt: 5,
          ),
      },
      polylines: {
        // Traveled Path (registered breadcrumb path driven by the car so far)
        if (widget.traveledPath.isNotEmpty)
          Polyline(
            polylineId: const PolylineId('traveled_path'),
            points: widget.traveledPath,
            color: const Color(0xFF2563EB), // Vibrant Blue
            width: 6,
            geodesic: true,
            jointType: JointType.round,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
            zIndex: 3,
          ),
        // Future route points (if route geometry is supplied)
        if (widget.routePoints.isNotEmpty)
          Polyline(
            polylineId: const PolylineId('route_ahead'),
            points: widget.routePoints,
            color: const Color(0xFF10B981), // Green route ahead
            width: 5,
            geodesic: true,
            jointType: JointType.round,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
            zIndex: 2,
          ),
      },
    );
  }
}
