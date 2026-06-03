import 'package:google_maps_flutter/google_maps_flutter.dart';

abstract class RideTrackingRepository {
  Future<Map<String, dynamic>> getDriverDetails();
  List<LatLng> getRoutePoints(LatLng start, LatLng end);
}
