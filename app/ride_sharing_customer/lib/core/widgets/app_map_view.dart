import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../features/location/utils/map_styles.dart';
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
  final String? driverVehicleType;
  final String? mapStyle;
  final List<LatLng> routePoints;
  final bool useGoogleMaps;
  final bool showPickupPulse;
  final bool myLocationEnabled;
  final bool myLocationButtonEnabled;
  final double initialZoom;
  final Function(LatLng)? onTap;
  final Function(GoogleMapController)? onMapCreated;

  const AppMapView({
    super.key,
    this.pickup,
    this.destination,
    this.driverPosition,
    this.driverBearing = 0.0,
    this.driverVehicleType,
    this.mapStyle,
    this.routePoints = const [],
    this.useGoogleMaps = true,
    this.showPickupPulse = false,
    this.myLocationEnabled = false,
    this.myLocationButtonEnabled = false,
    this.initialZoom = 15.0,
    this.onTap,
    this.onMapCreated,
  });

  @override
  State<AppMapView> createState() => _AppMapViewState();
}

class _AppMapViewState extends State<AppMapView> with SingleTickerProviderStateMixin {
  BitmapDescriptor _carIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
  late final AnimationController _pulseController;
  double _currentZoom = 15.0;

  @override
  void initState() {
    super.initState();
    _currentZoom = widget.initialZoom;
    _loadCarIcon();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );
    if (widget.showPickupPulse) {
      _pulseController.repeat();
    }
  }

  @override
  void didUpdateWidget(AppMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.driverVehicleType != widget.driverVehicleType) {
      _loadCarIcon();
    }
    if (oldWidget.showPickupPulse != widget.showPickupPulse) {
      if (widget.showPickupPulse) {
        _pulseController.repeat();
      } else {
        _pulseController.stop();
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  /// Converts desired screen pixels into ground meters for Google Maps Circle
  /// at the current camera zoom level and latitude (Web Mercator projection).
  double _getMetersForPixels(double pixels, double zoom, double lat) {
    final latRad = lat * math.pi / 180.0;
    final metersPerPixel = (156543.03392 * math.cos(latRad)) / math.pow(2.0, zoom);
    return pixels * metersPerPixel;
  }

  /// Builds a smooth, steady expanding radar wave that emerges continuously
  Circle _buildPulseCircle({
    required String id,
    required double phase,
    required double maxRadiusPixels,
    required double baseAlpha,
    required double zoom,
    required LatLng center,
  }) {
    final curvedProgress = Curves.easeOutCubic.transform(phase);
    final radiusPixels = 16.0 + (maxRadiusPixels - 16.0) * curvedProgress;
    final alpha = (1.0 - phase) * baseAlpha;

    return Circle(
      circleId: CircleId(id),
      center: center,
      radius: _getMetersForPixels(radiusPixels, zoom, center.latitude),
      fillColor: const Color(0xFF009048).withValues(alpha: alpha.clamp(0.0, 1.0)),
      strokeColor: const Color(0xFF009048).withValues(alpha: (alpha * 1.3).clamp(0.0, 1.0)),
      strokeWidth: 1,
      zIndex: 1,
    );
  }

  void _handleCameraMove(CameraPosition position) {
    _currentZoom = position.zoom;
  }

  Future<void> _loadCarIcon() async {
    if (widget.driverVehicleType == null) return;
    
    final type = widget.driverVehicleType!.toLowerCase();
    String assetPath = 'assets/ride-option/cab.png'; // default
    
    if (type.contains('auto')) {
      assetPath = 'assets/ride-option/auto.png';
    } else if (type.contains('bike') || type.contains('moto') || type.contains('two')) {
      assetPath = 'assets/ride-option/bike.png';
    } else if (type.contains('premium')) {
      assetPath = 'assets/ride-option/premium-cab.png';
    } else {
      assetPath = 'assets/ride-option/cab.png';
    }

    try {
      final ByteData byteData = await rootBundle.load(assetPath);
      // Decode image maintaining original aspect ratio without any cropping
      final ui.Codec codec = await ui.instantiateImageCodec(
        byteData.buffer.asUint8List(),
        targetWidth: 24, // Scaled down to compact marker icon size
      );
      final ui.FrameInfo frameInfo = await codec.getNextFrame();
      final ByteData? pngBytes = await frameInfo.image.toByteData(
        format: ui.ImageByteFormat.png,
      );

      if (pngBytes != null && mounted) {
        final icon = BitmapDescriptor.bytes(pngBytes.buffer.asUint8List());
        setState(() {
          _carIcon = icon;
        });
      }
    } catch (e) {
      // Fallback to default marker if asset fails to load
    }
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

    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return GoogleMap(
          onMapCreated: widget.onMapCreated,
          onCameraMove: _handleCameraMove,
          onTap: widget.onTap,
          myLocationEnabled: widget.myLocationEnabled,
          myLocationButtonEnabled: widget.myLocationButtonEnabled,
          // Platform-specific Google Cloud Map ID with custom style fallback
          mapId: AppConstants.cloudMapId,
          style: widget.mapStyle ?? AppMapStyles.uberSilver,

          initialCameraPosition: CameraPosition(
            target: widget.driverPosition ??
                widget.pickup ??
                const LatLng(22.5726, 88.3639),
            zoom: widget.initialZoom,
          ),

          circles: {
            if (widget.showPickupPulse && widget.pickup != null) ...[
              // Primary Wave
              _buildPulseCircle(
                id: 'pickup_pulse_wave1',
                phase: _pulseController.value,
                maxRadiusPixels: 95.0,
                baseAlpha: 0.25,
                zoom: _currentZoom,
                center: widget.pickup!,
              ),
              // Staggered Secondary Wave (offset by 50% for seamless continuous flow)
              _buildPulseCircle(
                id: 'pickup_pulse_wave2',
                phase: (_pulseController.value + 0.5) % 1.0,
                maxRadiusPixels: 95.0,
                baseAlpha: 0.25,
                zoom: _currentZoom,
                center: widget.pickup!,
              ),
              // Center Core Anchor at pin base
              Circle(
                circleId: const CircleId('pickup_pulse_core'),
                center: widget.pickup!,
                radius: _getMetersForPixels(
                  20.0,
                  _currentZoom,
                  widget.pickup!.latitude,
                ),
                fillColor: const Color(0xFF009048).withValues(alpha: 0.12),
                strokeColor: const Color(0xFF009048).withValues(alpha: 0.25),
                strokeWidth: 1,
                zIndex: 1,
              ),
            ],
          },

          markers: {
            if (widget.pickup != null)
              Marker(
                markerId: const MarkerId('pickup'),
                position: widget.pickup!,
                icon: BitmapDescriptor.defaultMarkerWithHue(150.0), // Green hue
                infoWindow: const InfoWindow(title: 'Pickup'),
                zIndexInt: 3,
              ),
            if (widget.destination != null)
              Marker(
                markerId: const MarkerId('destination'),
                position: widget.destination!,
                icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                infoWindow: const InfoWindow(title: 'Destination'),
                zIndexInt: 3,
              ),
            if (widget.driverPosition != null)
              Marker(
                markerId: const MarkerId('driver'),
                position: widget.driverPosition!,
                icon: _carIcon,
                anchor: const Offset(0.5, 0.5),
                flat: true,
                rotation: widget.driverBearing,
                zIndexInt: 4,
              ),
          },

          polylines: {
            if (widget.routePoints.isNotEmpty)
              Polyline(
                polylineId: const PolylineId('route'),
                points: widget.routePoints,
                // Ryva Ride primary brand green
                color: const Color(0xFF009048),
                width: 6,
                geodesic: true,
                jointType: JointType.round,
                startCap: Cap.roundCap,
                endCap: Cap.roundCap,
                zIndex: 2,
              ),
          },
        );
      },
    );
  }
}
