import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../domain/repositories/ride_tracking_repository.dart';
import '../datasources/ride_tracking_socket_datasource.dart';

class RideTrackingRepositoryImpl implements RideTrackingRepository {
  final RideTrackingSocketDataSource socketDataSource;

  RideTrackingRepositoryImpl({required this.socketDataSource});

  @override
  Future<void> connectToRide(String rideId) async {
    await socketDataSource.connectAndSubscribe(rideId);
  }

  @override
  void disconnectFromRide() {
    socketDataSource.disconnect();
  }

  @override
  Stream<Map<String, dynamic>> get onDriverAssigned => socketDataSource.onDriverAssigned;
  
  @override
  Stream<Map<String, dynamic>> get onDriverLocation => socketDataSource.onDriverLocation;

  @override
  Stream<Map<String, dynamic>> get onRideStarted => socketDataSource.onRideStarted;

  @override
  Stream<Map<String, dynamic>> get onRideCompleted => socketDataSource.onRideCompleted;

  @override
  Stream<Map<String, dynamic>> get onRideCancelled => socketDataSource.onRideCancelled;

  @override
  Stream<String> get onSocketError => socketDataSource.onSocketError;

  @override
  Future<Map<String, dynamic>> getDriverDetails() async {
    // Keep as fallback for mock mode if needed
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
