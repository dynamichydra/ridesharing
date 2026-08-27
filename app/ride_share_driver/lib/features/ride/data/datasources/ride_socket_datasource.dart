import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../../../config/api_config.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../services/app_logger.dart';
import '../../domain/entities/ride_offer.dart';
import '../../domain/entities/ride_accept_result.dart';

/// Owns the Socket.IO connection to the backend's `/driver` namespace.
/// Ride offers arrive *only* over this connection — there is no REST
/// endpoint to poll for them (confirmed against `backend/src/sockets/index.js`
/// and `backend/src/kafka/consumers/index.js`). Meant to be connected only
/// while the driver is online, mirroring how a real driver app behaves.
class RideSocketDataSource {
  final SecureStorage secureStorage;
  io.Socket? _socket;

  final _rideOfferController = StreamController<RideOffer>.broadcast();
  final _rideTakenController = StreamController<String>.broadcast();
  final _cancelledByRiderController = StreamController<String>.broadcast();
  final _socketErrorController = StreamController<String>.broadcast();
  final _acceptResultController = StreamController<RideAcceptResult>.broadcast();

  RideSocketDataSource({required this.secureStorage});

  Stream<RideOffer> get onRideOffer => _rideOfferController.stream;
  Stream<String> get onRideTaken => _rideTakenController.stream;
  Stream<String> get onRideCancelledByRider => _cancelledByRiderController.stream;
  Stream<String> get onSocketError => _socketErrorController.stream;
  Stream<RideAcceptResult> get onAcceptResult => _acceptResultController.stream;

  Future<void> connect() async {
    final token = await secureStorage.getToken();
    if (token == null) {
      _socketErrorController.add('Not authenticated.');
      return;
    }

    if (_socket != null) {
      if (_socket!.connected) {
        return;
      }
      try {
        _socket!.dispose();
      } catch (_) {}
      _socket = null;
    }

    final socket = io.io(
      '${ApiConfig.socketBaseUrl}/driver',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setReconnectionAttempts(50)
          .setAuth({'token': token})
          .setQuery({'token': token})
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .build(),
    );

    socket.onConnect((_) {
      AppLogger.i('[RideSocket] connected to /driver namespace');
    });
    socket.onConnectError((data) {
      AppLogger.w('[RideSocket] connection error: $data');
      _socketErrorController.add('Connection failed: $data');
    });
    socket.onDisconnect((reason) => AppLogger.i('[RideSocket] disconnected: $reason'));
    socket.onError((data) {
      AppLogger.w('[RideSocket] error: $data');
      _socketErrorController.add('Socket error: $data');
    });

    socket.on('error', (data) {
      final message = (data is Map) ? data['message']?.toString() : data?.toString();
      AppLogger.w('[RideSocket] received server error event: $message');
      _socketErrorController.add(message ?? 'Unknown socket error.');
    });

    socket.on('ride:new_request', (data) {
      AppLogger.i('[RideSocket] received ride:new_request: $data');
      if (data is Map) {
        try {
          final offer = RideOffer.fromJson(Map<String, dynamic>.from(data));
          AppLogger.i('[RideSocket] parsed RideOffer successfully: rideId=${offer.rideId}, fare=${offer.estimatedFare}');
          _rideOfferController.add(offer);
        } catch (e, st) {
          AppLogger.e('[RideSocket] failed to parse RideOffer: $e\n$st');
        }
      }
    });

    socket.on('ride:taken', (data) {
      AppLogger.i('[RideSocket] received ride:taken: $data');
      final rideId = (data is Map) ? data['rideId']?.toString() : null;
      if (rideId != null) _rideTakenController.add(rideId);
    });

    socket.on('ride:cancelled_by_rider', (data) {
      AppLogger.i('[RideSocket] received ride:cancelled_by_rider: $data');
      final rideId = (data is Map) ? data['rideId']?.toString() : null;
      if (rideId != null) _cancelledByRiderController.add(rideId);
    });

    socket.on('ride:cancelled', (data) {
      AppLogger.i('[RideSocket] received ride:cancelled: $data');
      final rideId = (data is Map) ? data['rideId']?.toString() : null;
      if (rideId != null) _cancelledByRiderController.add(rideId);
    });

    socket.on('ride:accept_ok', (data) {
      if (data is Map) {
        _acceptResultController.add(RideAcceptSucceeded(
          rideId: data['rideId'].toString(),
          status: data['status']?.toString() ?? 'accepted',
        ));
      }
    });

    socket.on('ride:accept_error', (data) {
      final message = (data is Map) ? data['message']?.toString() : null;
      _acceptResultController.add(RideAcceptFailed(message ?? 'Failed to accept ride.'));
    });

    _socket = socket;
    socket.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void acceptOffer(String rideId) {
    _socket?.emit('ride:accept', {'rideId': rideId});
  }

  /// Backend refreshes the driver's live Redis position from this and (if
  /// currently on a ride) forwards approach/trip progress to the rider —
  /// see `handleDriverLocationUpdate` in `ride.service.js`. No-op if the
  /// socket isn't connected.
  void emitLocationUpdate(
    double lat,
    double lng, {
    double? accuracy,
    double? speedKmh,
    int? recordedAt,
  }) {
    _socket?.emit('location_update', {
      'lat': lat,
      'lng': lng,
      if (accuracy != null) 'accuracy': accuracy,
      if (speedKmh != null) 'speedKmh': speedKmh,
      'recordedAt': recordedAt ?? DateTime.now().millisecondsSinceEpoch,
    });
  }

  void declineOffer(String rideId, {String? reason}) {
    _socket?.emit('ride:decline', {
      'rideId': rideId,
      if (reason != null) 'reason': reason,
    });
  }

  /// Closes the broadcast controllers themselves — call once when the owning
  /// Bloc is closed for good (not on every online/offline toggle).
  void dispose() {
    disconnect();
    _rideOfferController.close();
    _rideTakenController.close();
    _cancelledByRiderController.close();
    _socketErrorController.close();
    _acceptResultController.close();
  }
}
