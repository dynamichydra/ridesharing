import 'dart:async';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';
import '../../domain/entities/ride_chat_message.dart';
import '../../../ride/data/datasources/ride_socket_datasource.dart';

class RideChatDataSource {
  final ApiClient apiClient;
  final RideSocketDataSource socketDataSource;

  RideChatDataSource({
    required this.apiClient,
    required this.socketDataSource,
  });

  Stream<RideChatMessage> get onChatMessage => socketDataSource.onChatMessage;

  Future<List<RideChatMessage>> getMessages(String rideId) async {
    try {
      final response = await apiClient.dio.get('/rides/$rideId/messages');
      if (response.data['SUCCESS'] == true) {
        final list = response.data['MESSAGE'] as List? ?? [];
        return list.map((item) => RideChatMessage.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<RideChatMessage> sendMessage(String rideId, String content, {String messageType = 'text'}) async {
    try {
      // Post to REST API for guaranteed persistence, DB insertion & socket broadcast
      final response = await apiClient.dio.post('/rides/$rideId/messages', data: {
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
        senderRole: 'driver',
        content: content,
        createdAt: DateTime.now(),
      );
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  void markAsRead(String rideId) {
    socketDataSource.markChatRead(rideId);
  }
}
