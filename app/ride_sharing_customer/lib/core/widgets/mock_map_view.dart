import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../constants/constants.dart';

class MockMapView extends StatefulWidget {
  final LatLng? pickup;
  final LatLng? destination;
  final LatLng? driverPosition;
  final double driverBearing;
  final List<LatLng> routePoints;

  const MockMapView({
    super.key,
    this.pickup,
    this.destination,
    this.driverPosition,
    this.driverBearing = 0.0,
    this.routePoints = const [],
  });

  @override
  State<MockMapView> createState() => _MockMapViewState();
}

class _MockMapViewState extends State<MockMapView> {
  final TransformationController _transformationController = TransformationController();

  // Bounding box for LA coordinate mapping
  static const double minLat = 12.90;
  static const double maxLat = 13.25;
  static const double minLng = 77.50;
  static const double maxLng = 77.80;

  static double latToY(double lat, double height) {
    final double norm = (lat - minLat) / (maxLat - minLat);
    return height - (norm * height);
  }

  static double lngToX(double lng, double width) {
    final double norm = (lng - minLng) / (maxLng - minLng);
    return norm * width;
  }

  @override
  void initState() {
    super.initState();
    // Center map around the driver or pickup point
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final centerLat = widget.driverPosition?.latitude ?? widget.pickup?.latitude ?? 12.9716;
      final centerLng = widget.driverPosition?.longitude ?? widget.pickup?.longitude ?? 77.5946;
      
      final x = lngToX(centerLng, 1200);
      final y = latToY(centerLat, 1200);

      // Translate viewer to center on coordinates
      _transformationController.value = Matrix4.identity()
        ..translate(-x + 200, -y + 300)
        ..scale(1.2);
    });
  }

  @override
  void didUpdateWidget(covariant MockMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.driverPosition != oldWidget.driverPosition && widget.driverPosition != null) {
      // Smoothly pan camera to track driver if they moved
      final x = lngToX(widget.driverPosition!.longitude, 1200);
      final y = latToY(widget.driverPosition!.latitude, 1200);
      
      // Update transformation matrix to center on the vehicle
      setState(() {
        _transformationController.value = Matrix4.identity()
          ..translate(-x + 200, -y + 300)
          ..scale(1.5);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      color: isDark ? const Color(0xFF141416) : const Color(0xFFEFEFF4),
      child: InteractiveViewer(
        transformationController: _transformationController,
        maxScale: 4.0,
        minScale: 0.5,
        child: SizedBox(
          width: 1200,
          height: 1200,
          child: CustomPaint(
            painter: MapPainter(
              pickup: widget.pickup,
              destination: widget.destination,
              driverPosition: widget.driverPosition,
              driverBearing: widget.driverBearing,
              routePoints: widget.routePoints,
              isDark: isDark,
            ),
          ),
        ),
      ),
    );
  }
}

class MapPainter extends CustomPainter {
  final LatLng? pickup;
  final LatLng? destination;
  final LatLng? driverPosition;
  final double driverBearing;
  final List<LatLng> routePoints;
  final bool isDark;

  MapPainter({
    this.pickup,
    this.destination,
    this.driverPosition,
    required this.driverBearing,
    required this.routePoints,
    required this.isDark,
  });

  // Projection logic helper inside painter
  double getX(double lng, double width) {
    return ((lng - _MockMapViewState.minLng) / (_MockMapViewState.maxLng - _MockMapViewState.minLng)) * width;
  }

  double getY(double lat, double height) {
    final double norm = (lat - _MockMapViewState.minLat) / (_MockMapViewState.maxLat - _MockMapViewState.minLat);
    return height - (norm * height);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final height = size.height;

    // Draw clean modern background
    final bgPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: isDark
            ? [const Color(0xFF141416), const Color(0xFF1E1E22)]
            : [const Color(0xFFF4F5F8), const Color(0xFFFFFFFF)],
      ).createShader(Rect.fromLTWH(0, 0, width, height));
    canvas.drawRect(Rect.fromLTWH(0, 0, width, height), bgPaint);

    // 4. Draw Route Line Path if available
    if (routePoints.isNotEmpty) {
      final routePathPaint = Paint()
        ..color = AppColors.primaryBlue
        ..strokeWidth = 6
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;

      final Path path = Path();
      path.moveTo(getX(routePoints.first.longitude, width), getY(routePoints.first.latitude, height));
      for (int i = 1; i < routePoints.length; i++) {
        path.lineTo(getX(routePoints[i].longitude, width), getY(routePoints[i].latitude, height));
      }
      canvas.drawPath(path, routePathPaint);
    }

    // 5. Draw Pickup Marker
    if (pickup != null) {
      final px = getX(pickup!.longitude, width);
      final py = getY(pickup!.latitude, height);

      // Pulse circle
      final pulsePaint = Paint()
        ..color = AppColors.primaryBlue.withOpacity(0.2)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(px, py), 22, pulsePaint);

      // Outer Pin body
      final pinPaint = Paint()
        ..color = AppColors.primaryBlue
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(px, py), 10, pinPaint);

      // Inner dot
      final dotPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(px, py), 4, dotPaint);
    }

    // 6. Draw Destination Marker
    if (destination != null) {
      final dx = getX(destination!.longitude, width);
      final dy = getY(destination!.latitude, height);

      // Outer Pin body
      final pinPaint = Paint()
        ..color = AppColors.lightPrimary
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(dx, dy), 10, pinPaint);

      // Inner square
      final rectPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawRect(Rect.fromCenter(center: Offset(dx, dy), width: 7, height: 7), rectPaint);
    }

    // 7. Draw Driver Vehicle
    if (driverPosition != null) {
      final tx = getX(driverPosition!.longitude, width);
      final ty = getY(driverPosition!.latitude, height);

      canvas.save();
      canvas.translate(tx, ty);
      // Rotate canvas according to bearing
      canvas.rotate(driverBearing * math.pi / 180);

      // Glow backing
      final carGlow = Paint()
        ..color = AppColors.successGreen.withOpacity(0.3)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset.zero, 18, carGlow);

      // Car body (electric black/white green outline)
      final carPaint = Paint()
        ..color = AppColors.successGreen
        ..style = PaintingStyle.fill;
      
      // Draw a simplified triangle/car shape pointed UP
      final Path carPath = Path()
        ..moveTo(0, -12) // Front nose
        ..lineTo(8, 10)  // Rear right
        ..lineTo(0, 6)   // Tail indent
        ..lineTo(-8, 10) // Rear left
        ..close();
      canvas.drawPath(carPath, carPaint);
      
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant MapPainter oldDelegate) {
    return oldDelegate.pickup != pickup ||
        oldDelegate.destination != destination ||
        oldDelegate.driverPosition != driverPosition ||
        oldDelegate.driverBearing != driverBearing ||
        oldDelegate.routePoints != routePoints ||
        oldDelegate.isDark != isDark;
  }
}
