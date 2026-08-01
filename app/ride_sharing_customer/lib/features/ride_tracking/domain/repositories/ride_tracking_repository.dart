import 'package:google_maps_flutter/google_maps_flutter.dart';

abstract class RideTrackingRepository {
  Future<void> connectToRide(String rideId);
  void disconnectFromRide();
  Stream<Map<String, dynamic>> get onDriverAssigned;
  Stream<Map<String, dynamic>> get onDriverLocation;
  Stream<Map<String, dynamic>> get onRideStarted;
  Stream<Map<String, dynamic>> get onRideCompleted;
  Stream<Map<String, dynamic>> get onRideCancelled;
  Stream<String> get onSocketError;

  Future<Map<String, dynamic>> getDriverDetails(); // Keeping fallback
  List<LatLng> getRoutePoints(LatLng start, LatLng end); // Keeping fallback for ui tests
}
