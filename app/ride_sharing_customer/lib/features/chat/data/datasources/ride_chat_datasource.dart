import 'dart:async';
import '../../../../core/network/dio_client.dart';
import '../../domain/entities/ride_chat_message.dart';
import '../../../ride_tracking/data/datasources/ride_tracking_socket_datasource.dart';

class CustomerRideChatDataSource {
  final DioClient dioClient;
  final RideTrackingSocketDataSource socketDataSource;

  CustomerRideChatDataSource({
    required this.dioClient,
    required this.socketDataSource,
  });

  Future<void> ensureConnected(String rideId) async {
    try {
      await socketDataSource.connectAndSubscribe(rideId);
    } catch (_) {}
  }

  Stream<RideChatMessage> get onChatMessage => socketDataSource.onChatMessage.map(
    (map) => RideChatMessage.fromJson(map),
  );

  Future<List<RideChatMessage>> getMessages(String rideId) async {
    try {
      final response = await dioClient.dio.get('/api/v1/rides/$rideId/messages');
      if (response.data['SUCCESS'] == true) {
        final list = response.data['MESSAGE'] as List? ?? [];
        return list.map((item) => RideChatMessage.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<RideChatMessage> sendMessage(String rideId, String content, {String messageType = 'text'}) async {
    try {
      final response = await dioClient.dio.post('/api/v1/rides/$rideId/messages', data: {
        'content': content,
        'messageType': messageType,
      });

      if (response.data['SUCCESS'] == true && response.data['MESSAGE'] is Map) {
        return RideChatMessage.fromJson(response.data['MESSAGE'] as Map<String, dynamic>);
      }
      return RideChatMessage(
        id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
        rideId: rideId,
        senderId: '',
        senderRole: 'rider',
        content: content,
        createdAt: DateTime.now(),
      );
    } catch (_) {
      return RideChatMessage(
        id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
        rideId: rideId,
        senderId: '',
        senderRole: 'rider',
        content: content,
        createdAt: DateTime.now(),
      );
    }
  }

  void markAsRead(String rideId) {
    socketDataSource.markChatRead(rideId);
  }
}
