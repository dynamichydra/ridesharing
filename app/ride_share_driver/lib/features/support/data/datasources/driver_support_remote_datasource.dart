import '../../../../core/network/api_client.dart';
import '../models/driver_support_models.dart';

class DriverSupportRemoteDataSource {
  final ApiClient apiClient;

  DriverSupportRemoteDataSource({required this.apiClient});

  Future<List<DriverSupportCategoryModel>> getCategories() async {
    final response = await apiClient.dio.get('/support/categories', queryParameters: {'targetRole': 'driver'});
    if (response.data != null && response.data['SUCCESS'] == true) {
      final List raw = response.data['MESSAGE'] ?? [];
      return raw.map((e) => DriverSupportCategoryModel.fromJson(e)).toList();
    }
    return [];
  }

  Future<List<DriverSupportFaqModel>> getFaqs({String? categoryId, String? query}) async {
    final Map<String, dynamic> params = {'targetRole': 'driver'};
    if (categoryId != null) params['categoryId'] = categoryId;
    if (query != null && query.isNotEmpty) params['query'] = query;

    final response = await apiClient.dio.get('/support/faqs', queryParameters: params);
    if (response.data != null && response.data['SUCCESS'] == true) {
      final List raw = response.data['MESSAGE'] ?? [];
      return raw.map((e) => DriverSupportFaqModel.fromJson(e)).toList();
    }
    return [];
  }

  Future<DriverSupportTicketModel> createTicket({
    required String categoryId,
    String? rideId,
    required String subject,
    required String description,
    String priority = 'medium',
  }) async {
    final response = await apiClient.dio.post('/support/tickets', data: {
      'categoryId': categoryId,
      'rideId': rideId,
      'subject': subject,
      'description': description,
      'priority': priority,
      'userType': 'driver',
    });

    if (response.data != null && response.data['SUCCESS'] == true) {
      return DriverSupportTicketModel.fromJson(response.data['MESSAGE']);
    }
    throw Exception(response.data?['MESSAGE'] ?? 'Failed to create support ticket');
  }

  Future<List<DriverSupportTicketModel>> getDriverTickets({String? status}) async {
    final params = {'userType': 'driver'};
    if (status != null && status != 'all') params['status'] = status;

    final response = await apiClient.dio.get('/support/tickets', queryParameters: params);
    if (response.data != null && response.data['SUCCESS'] == true) {
      final List raw = response.data['MESSAGE'] ?? [];
      return raw.map((e) => DriverSupportTicketModel.fromJson(e)).toList();
    }
    return [];
  }

  Future<DriverSupportTicketModel> getTicketDetails(String ticketId) async {
    final response = await apiClient.dio.get('/support/tickets/$ticketId');
    if (response.data != null && response.data['SUCCESS'] == true) {
      return DriverSupportTicketModel.fromJson(response.data['MESSAGE']);
    }
    throw Exception('Failed to load ticket details');
  }

  Future<DriverSupportMessageModel> addMessage(String ticketId, String content) async {
    final response = await apiClient.dio.post('/support/tickets/$ticketId/messages', data: {
      'content': content,
      'messageType': 'text',
    });

    if (response.data != null && response.data['SUCCESS'] == true) {
      return DriverSupportMessageModel.fromJson(response.data['MESSAGE']);
    }
    throw Exception('Failed to send message');
  }
}
