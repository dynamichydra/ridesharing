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

    // 1. Draw Park backgrounds (light green / dark olive)
    final parkPaint = Paint()
      ..color = isDark ? const Color(0xFF1B2C1E) : const Color(0xFFD4ECD5)
      ..style = PaintingStyle.fill;
    
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(100, 150, 250, 200), const Radius.circular(20)), parkPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(800, 700, 300, 250), const Radius.circular(20)), parkPaint);

    // 2. Draw River / Water body (light blue / deep navy)
    final waterPaint = Paint()
      ..color = isDark ? const Color(0xFF1B2433) : const Color(0xFFC7E2F2)
      ..style = PaintingStyle.fill;
    
    final Path riverPath = Path()
      ..moveTo(0, 100)
      ..quadraticBezierTo(400, 120, 600, 400)
      ..quadraticBezierTo(800, 680, 1200, 750)
      ..lineTo(1200, 850)
      ..quadraticBezierTo(800, 780, 600, 500)
      ..quadraticBezierTo(400, 220, 0, 200)
      ..close();
    canvas.drawPath(riverPath, waterPaint);

    // 3. Draw Grid Streets
    final streetPaint = Paint()
      ..color = isDark ? const Color(0xFF28282B) : const Color(0xFFFFFFFF)
      ..strokeWidth = 14
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final borderPaint = Paint()
      ..color = isDark ? const Color(0xFF1A1A1C) : const Color(0xFFE4E4EB)
      ..strokeWidth = 18
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // List of static mock roads (lines)
    final List<List<Offset>> roads = [
      // Horizontals
      [Offset(0, 100), Offset(1200, 100)],
      [Offset(0, 300), Offset(1200, 300)],
      [Offset(0, 550), Offset(1200, 550)],
      [Offset(0, 800), Offset(1200, 800)],
      [Offset(0, 1050), Offset(1200, 1050)],
      // Verticals
      [Offset(150, 0), Offset(150, 1200)],
      [Offset(450, 0), Offset(450, 1200)],
      [Offset(750, 0), Offset(750, 1200)],
      [Offset(1000, 0), Offset(1000, 1200)],
    ];

    // Draw borders first, then inner streets to make roads look bounded
    for (final road in roads) {
      canvas.drawLine(road[0], road[1], borderPaint);
    }
    for (final road in roads) {
      canvas.drawLine(road[0], road[1], streetPaint);
    }

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
