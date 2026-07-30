import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../domain/repositories/ride_tracking_repository.dart';


class RideTrackingRepositoryImpl implements RideTrackingRepository {
  @override
  Future<Map<String, dynamic>> getDriverDetails() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return {
      'name': 'David Miller',
      'rating': 4.95,
      'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      'vehicle': 'Tesla Model Y White',
      'plate_number': '5RIDE42',
      'phone': '+1 555-901-2940'
    };
  }

  @override
  List<LatLng> getRoutePoints(LatLng start, LatLng end) {
    // Linear interpolation between two points for smooth driver dot animation.
    // This is not road routing — use GoogleRoutesService for real route polylines.
    const int steps = 35;
    final List<LatLng> points = [];
    for (int i = 0; i <= steps; i++) {
      final double t = i / steps;
      points.add(LatLng(
        start.latitude + (end.latitude - start.latitude) * t,
        start.longitude + (end.longitude - start.longitude) * t,
      ));
    }
    return points;
  }
}
