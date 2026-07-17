import '../../domain/entities/active_ride.dart';
import '../../domain/entities/ride_offer.dart';
import '../../domain/entities/ride_accept_result.dart';
import '../../domain/repositories/ride_repository.dart';
import '../datasources/ride_remote_datasource.dart';
import '../datasources/ride_socket_datasource.dart';

class RideRepositoryImpl implements RideRepository {
  final RideRemoteDataSource remoteDataSource;
  final RideSocketDataSource socketDataSource;

  RideRepositoryImpl({required this.remoteDataSource, required this.socketDataSource});

  @override
  void connect() => socketDataSource.connect();

  @override
  void disconnect() => socketDataSource.disconnect();

  @override
  Stream<RideOffer> get onRideOffer => socketDataSource.onRideOffer;

  @override
  Stream<String> get onRideTaken => socketDataSource.onRideTaken;

  @override
  Stream<String> get onRideCancelledByRider => socketDataSource.onRideCancelledByRider;

  @override
  Stream<String> get onSocketError => socketDataSource.onSocketError;

  @override
  Stream<RideAcceptResult> get onAcceptResult => socketDataSource.onAcceptResult;

  @override
  void acceptOffer(String rideId) => socketDataSource.acceptOffer(rideId);

  @override
  void declineOffer(String rideId, {String? reason}) => socketDataSource.declineOffer(rideId, reason: reason);

  @override
  void sendLocationUpdate(double lat, double lng) => socketDataSource.emitLocationUpdate(lat, lng);

  @override
  Future<ActiveRide> markArriving(String rideId) async {
    final json = await remoteDataSource.markArriving(rideId);
    return ActiveRide.fromJson(json);
  }

  @override
  Future<ActiveRide> startRide(String rideId) async {
    final json = await remoteDataSource.startRide(rideId);
    return ActiveRide.fromJson(json);
  }

  @override
  Future<ActiveRide> completeRide(String rideId) async {
    final json = await remoteDataSource.completeRide(rideId);
    return ActiveRide.fromJson(json);
  }

  @override
  Future<void> cancelRideByDriver(String rideId, {String? reason}) {
    return remoteDataSource.cancelRideByDriver(rideId, reason: reason);
  }

  @override
  Future<ActiveRide?> getActiveRide() async {
    final json = await remoteDataSource.getActiveRide();
    if (json == null) return null;
    return ActiveRide.fromJson(json);
  }
}
