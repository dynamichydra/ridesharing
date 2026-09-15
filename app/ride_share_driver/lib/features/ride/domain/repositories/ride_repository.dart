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

  /// Emits `go_online {lat, lng}` over the socket so the backend registers
  /// the driver in the H3 geo-index and publishes the status Kafka event.
  void goOnlineViaSocket(double lat, double lng);

  /// Emits `go_offline` over the socket for a clean deregistration before
  /// the physical socket disconnect fires.
  void goOfflineViaSocket();

  // ── REST lifecycle actions ────────────────────────────────────────────────
  Future<ActiveRide> markArriving(String rideId);
  Future<ActiveRide> markArrived(String rideId);
  Future<ActiveRide> startRide(String rideId, String otp);
  Future<ActiveRide> completeRide(String rideId);
  Future<void> cancelRideByDriver(String rideId, {String? reason});
  Future<ActiveRide?> getActiveRide();
}
