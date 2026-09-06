import 'package:google_maps_flutter/google_maps_flutter.dart';

abstract class HomeRepository {
  Future<LatLng> getCurrentLocation();
  Future<List<Map<String, dynamic>>> searchPlaces(String query);
  Future<List<Map<String, dynamic>>> getSavedPlaces();
  Future<List<Map<String, dynamic>>> getRecentRides();
}
