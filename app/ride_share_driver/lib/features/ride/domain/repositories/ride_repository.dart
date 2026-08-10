import '../entities/active_ride.dart';
import '../entities/ride_offer.dart';
import '../entities/ride_accept_result.dart';

abstract class RideRepository {
  // ── Socket.IO /driver namespace lifecycle ─────────────────────────────────
  // Only meaningful while the driver is online — offers arrive purely over
  // this connection, there is no REST poll-for-offer endpoint.
  void connect();
  void disconnect();

  Stream<RideOffer> get onRideOffer;
  Stream<String> get onRideTaken; // rideId — another driver accepted first
  Stream<String> get onRideCancelledByRider; // rideId
  Stream<String> get onSocketError;

  void acceptOffer(String rideId);
  void declineOffer(String rideId, {String? reason});
  Stream<RideAcceptResult> get onAcceptResult;
  void sendLocationUpdate(
    double lat,
    double lng, {
    double? accuracy,
    double? speedKmh,
    int? recordedAt,
  });

  // ── REST lifecycle actions ────────────────────────────────────────────────
  Future<ActiveRide> markArriving(String rideId);
  Future<ActiveRide> startRide(String rideId, String otp);
  Future<ActiveRide> completeRide(String rideId);
  Future<void> cancelRideByDriver(String rideId, {String? reason});
  Future<ActiveRide?> getActiveRide();
}
