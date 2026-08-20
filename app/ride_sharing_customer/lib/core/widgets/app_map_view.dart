import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../constants/constants.dart';
import 'mock_map_view.dart';

// ---------------------------------------------------------------------------
// AppMapView
// ---------------------------------------------------------------------------

/// Full-screen Google Map widget for Ryva Ride.
///
/// Features:
/// - Custom green pin for pickup, red pin for destination
/// - Primary-brand-green polyline for real driving route (Google Routes API)
/// - geodesic, rounded caps, zIndex:2 for route clarity
/// - [onMapCreated] exposes [GoogleMapController] for camera control
class AppMapView extends StatefulWidget {
  final LatLng? pickup;
  final LatLng? destination;
  final LatLng? driverPosition;
  final double driverBearing;
  final List<LatLng> routePoints;
  final bool useGoogleMaps;
  final double initialZoom;
  final Function(LatLng)? onTap;
  final Function(GoogleMapController)? onMapCreated;

  const AppMapView({
    super.key,
    this.pickup,
    this.destination,
    this.driverPosition,
    this.driverBearing = 0.0,
    this.routePoints = const [],
    this.useGoogleMaps = true,
    this.initialZoom = 15.0,
    this.onTap,
    this.onMapCreated,
  });

  @override
  State<AppMapView> createState() => _AppMapViewState();
}

class _AppMapViewState extends State<AppMapView> {
  /// Custom marker icon for the pickup location (primary green).
  BitmapDescriptor _pickupIcon = BitmapDescriptor.defaultMarker;

  /// Custom marker icon for the destination location (rose red).
  BitmapDescriptor _destinationIcon = BitmapDescriptor.defaultMarker;

  bool _iconsReady = false;

  @override
  void initState() {
    super.initState();
    _generateMarkerIcons();
  }

  // ---------------------------------------------------------------------------
  // Custom marker generation
  // ---------------------------------------------------------------------------

  Future<void> _generateMarkerIcons() async {
    // Use a temporary BuildContext-independent size; pixel ratio resolved in _createCircleMarker
    final pickup = await _createCircleMarker(
      fillColor: const Color(0xFF009048), // Primary brand green
      strokeColor: Colors.white,
      size: 48,
      innerDotColor: Colors.white,
    );
    final destination = await _createCircleMarker(
      fillColor: const Color(0xFFE11D48), // Destination rose-red
      strokeColor: Colors.white,
      size: 48,
      innerDotColor: Colors.white,
    );

    if (mounted) {
      setState(() {
        _pickupIcon = pickup;
        _destinationIcon = destination;
        _iconsReady = true;
      });
    }
  }

  /// Draws a solid filled circle marker with a small inner dot using Canvas,
  /// then converts it to a [BitmapDescriptor] for use as a Google Maps marker.
  Future<BitmapDescriptor> _createCircleMarker({
    required Color fillColor,
    required Color strokeColor,
    required double size,
    required Color innerDotColor,
  }) async {
    // Default to 3x for crisp rendering on high-density screens
    const double devicePixelRatio = 3.0;
    final int px = (size * devicePixelRatio).round();

    final ui.PictureRecorder recorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(recorder);
    final double radius = px / 2.0;
    final Offset center = Offset(radius, radius);

    // Outer shadow
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = fillColor.withValues(alpha: 0.25)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
    );

    // Main filled circle
    canvas.drawCircle(center, radius * 0.78, Paint()..color = fillColor);

    // White stroke ring
    canvas.drawCircle(
      center,
      radius * 0.78,
      Paint()
        ..color = strokeColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = radius * 0.18,
    );

    // Inner white dot
    canvas.drawCircle(center, radius * 0.22, Paint()..color = innerDotColor);

    final ui.Image image =
        await recorder.endRecording().toImage(px, px);
    final ByteData? byteData =
        await image.toByteData(format: ui.ImageByteFormat.png);

    return BitmapDescriptor.bytes(
      byteData!.buffer.asUint8List(),
      width: size,
      height: size,
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    if (!widget.useGoogleMaps) {
      return MockMapView(
        pickup: widget.pickup,
        destination: widget.destination,
        driverPosition: widget.driverPosition,
        driverBearing: widget.driverBearing,
        routePoints: widget.routePoints,
      );
    }

    return GoogleMap(
      onMapCreated: widget.onMapCreated,
      onTap: widget.onTap,
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
      // Platform-specific Google Cloud Map ID
      mapId: AppConstants.cloudMapId,

      initialCameraPosition: CameraPosition(
        target: widget.driverPosition ??
            widget.pickup ??
            const LatLng(22.5726, 88.3639),
        zoom: widget.initialZoom,
      ),

      markers: {
        if (widget.pickup != null)
          Marker(
            markerId: const MarkerId('pickup'),
            position: widget.pickup!,
            icon: _iconsReady
                ? _pickupIcon
                : BitmapDescriptor.defaultMarkerWithHue(150.0),
            infoWindow: const InfoWindow(title: 'Pickup'),
            zIndexInt: 3,
          ),
        if (widget.destination != null)
          Marker(
            markerId: const MarkerId('destination'),
            position: widget.destination!,
            icon: _iconsReady
                ? _destinationIcon
                : BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueRed),
            infoWindow: const InfoWindow(title: 'Destination'),
            zIndexInt: 3,
          ),
        if (widget.driverPosition != null)
          Marker(
            markerId: const MarkerId('driver'),
            position: widget.driverPosition!,
            icon: BitmapDescriptor.defaultMarkerWithHue(
                BitmapDescriptor.hueGreen),
            rotation: widget.driverBearing,
            zIndexInt: 4,
          ),
      },

      polylines: {
        if (widget.routePoints.isNotEmpty) ...[
          // Outer pipeline outline / casing (Google Maps route pipeline border)
          Polyline(
            polylineId: const PolylineId('route_border'),
            points: widget.routePoints,
            color: const Color(0xFF005B2D),
            width: 8,
            geodesic: true,
            jointType: JointType.round,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
            zIndex: 1,
          ),
          // Inner route pipeline
          Polyline(
            polylineId: const PolylineId('route'),
            points: widget.routePoints,
            // Ryva Ride primary brand green
            color: const Color(0xFF009048),
            width: 5,
            geodesic: true,
            jointType: JointType.round,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
            zIndex: 2,
          ),
        ],
      },
    );
  }
}
