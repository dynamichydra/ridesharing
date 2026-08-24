import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/services/app_logger.dart';

class RideTrackingSocketDataSource {
  final StorageService storageService;
  io.Socket? _socket;

  final _driverAssignedController = StreamController<Map<String, dynamic>>.broadcast();
  final _driverLocationController = StreamController<Map<String, dynamic>>.broadcast();
  final _rideStartedController = StreamController<Map<String, dynamic>>.broadcast();
  final _rideCompletedController = StreamController<Map<String, dynamic>>.broadcast();
  final _rideCancelledController = StreamController<Map<String, dynamic>>.broadcast();
  final _socketErrorController = StreamController<String>.broadcast();

  RideTrackingSocketDataSource({required this.storageService});

  Stream<Map<String, dynamic>> get onDriverAssigned => _driverAssignedController.stream;
  Stream<Map<String, dynamic>> get onDriverLocation => _driverLocationController.stream;
  Stream<Map<String, dynamic>> get onRideStarted => _rideStartedController.stream;
  Stream<Map<String, dynamic>> get onRideCompleted => _rideCompletedController.stream;
  Stream<Map<String, dynamic>> get onRideCancelled => _rideCancelledController.stream;
  Stream<String> get onSocketError => _socketErrorController.stream;

  Future<void> connectAndSubscribe(String rideId) async {
    if (_socket != null) {
      _socket?.disconnect();
      _socket?.dispose();
    }

    final token = await storageService.getToken();
    if (token == null) {
      _socketErrorController.add('Not authenticated.');
      return;
    }

    final socket = io.io(
      '${DioClient.socketBaseUrl}/rider',
      io.OptionBuilder()
          .setTransports(['websocket','polling'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    socket.onConnect((_) {
      AppLogger.i('[RideTrackingSocket] connected to /rider namespace');
      AppLogger.d('[RideTrackingSocket] emitting ride:subscribe with rideId: $rideId');
      // Subscribe to the specific ride updates
      socket.emit('ride:subscribe', {'rideId': rideId});
    });

    socket.onConnectError((data) {
      AppLogger.w('[RideTrackingSocket] connection error: $data');
      _socketErrorController.add('Connection failed: $data');
    });

    socket.onDisconnect((reason) {
      AppLogger.i('[RideTrackingSocket] disconnected: $reason');
    });

    socket.onError((data) {
      AppLogger.w('[RideTrackingSocket] socket error: $data');
      _socketErrorController.add('Socket error: $data');
    });

    socket.on('error', (data) {
      AppLogger.w('[RideTrackingSocket] error event received: $data');
      final message = (data is Map) ? data['message']?.toString() : data?.toString();
      _socketErrorController.add(message ?? 'Unknown socket error.');
    });

    socket.on('ride:driver_assigned', (data) {
      AppLogger.d('[RideTrackingSocket] event: ride:driver_assigned -> $data');
      if (data is Map) {
        _driverAssignedController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('driver:location', (data) {
      AppLogger.d('[RideTrackingSocket] event: driver:location -> $data');
      if (data is Map) {
        _driverLocationController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('ride:started', (data) {
      AppLogger.d('[RideTrackingSocket] event: ride:started -> $data');
      if (data is Map) {
        _rideStartedController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('ride:completed', (data) {
      AppLogger.d('[RideTrackingSocket] event: ride:completed -> $data');
      if (data is Map) {
        _rideCompletedController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('ride:cancelled', (data) {
      AppLogger.d('[RideTrackingSocket] event: ride:cancelled -> $data');
      if (data is Map) {
        _rideCancelledController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket = socket;
    socket.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _driverAssignedController.close();
    _driverLocationController.close();
    _rideStartedController.close();
    _rideCompletedController.close();
    _rideCancelledController.close();
    _socketErrorController.close();
  }
}
