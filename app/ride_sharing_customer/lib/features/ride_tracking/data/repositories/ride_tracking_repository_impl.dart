import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../domain/repositories/ride_tracking_repository.dart';
import '../../../../core/utils/location_helper.dart';

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
    // Generate 35 points for a smooth visual tracking transition
    return LocationHelper.generateRoutePoints(start, end, 35);
  }
}
