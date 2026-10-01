import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';
import '../models/support_models.dart';

abstract class SupportDataSource {
  Future<List<SupportCategoryModel>> getCategories();
  Future<List<SupportFaqModel>> getFaqs({String? categoryId, String? query});
  Future<SupportTicketModel> createTicket({
    required String categoryId,
    String? rideId,
    required String subject,
    required String description,
    String priority = 'medium',
    List<String> attachments = const [],
  });
  Future<List<SupportTicketModel>> getUserTickets({String? status});
  Future<SupportTicketModel> getTicketDetails(String ticketId);
  Future<SupportMessageModel> addMessage(String ticketId, String content);
  Future<void> submitCsat(String ticketId, int rating, {String? feedback, String? tags});
}

class SupportDataSourceImpl implements SupportDataSource {
  final DioClient dioClient;
  final StorageService storageService;

  SupportDataSourceImpl({required this.dioClient, required this.storageService});

  @override
  Future<List<SupportCategoryModel>> getCategories() async {
    final response = await dioClient.dio.get('/api/v1/support/categories', queryParameters: {'targetRole': 'rider'});
    if (response.data != null && response.data['SUCCESS'] == true) {
      final List raw = response.data['MESSAGE'] ?? [];
      return raw.map((e) => SupportCategoryModel.fromJson(e)).toList();
    }
    return [];
  }

  @override
  Future<List<SupportFaqModel>> getFaqs({String? categoryId, String? query}) async {
    final Map<String, dynamic> params = {'targetRole': 'rider'};
    if (categoryId != null) params['categoryId'] = categoryId;
    if (query != null && query.isNotEmpty) params['query'] = query;

    final response = await dioClient.dio.get('/api/v1/support/faqs', queryParameters: params);
    if (response.data != null && response.data['SUCCESS'] == true) {
      final List raw = response.data['MESSAGE'] ?? [];
      return raw.map((e) => SupportFaqModel.fromJson(e)).toList();
    }
    return [];
  }

  @override
  Future<SupportTicketModel> createTicket({
    required String categoryId,
    String? rideId,
    required String subject,
    required String description,
    String priority = 'medium',
    List<String> attachments = const [],
  }) async {
    final response = await dioClient.dio.post('/api/v1/support/tickets', data: {
      'categoryId': categoryId,
      'rideId': rideId,
      'subject': subject,
      'description': description,
      'priority': priority,
      'attachments': attachments,
      'userType': 'rider',
    });

    if (response.data != null && response.data['SUCCESS'] == true) {
      return SupportTicketModel.fromJson(response.data['MESSAGE']);
    }
    throw Exception(response.data?['MESSAGE'] ?? 'Failed to create support ticket');
  }

  @override
  Future<List<SupportTicketModel>> getUserTickets({String? status}) async {
    final params = {'userType': 'rider'};
    if (status != null && status != 'all') params['status'] = status;

    final response = await dioClient.dio.get('/api/v1/support/tickets', queryParameters: params);
    if (response.data != null && response.data['SUCCESS'] == true) {
      final List raw = response.data['MESSAGE'] ?? [];
      return raw.map((e) => SupportTicketModel.fromJson(e)).toList();
    }
    return [];
  }

  @override
  Future<SupportTicketModel> getTicketDetails(String ticketId) async {
    final response = await dioClient.dio.get('/api/v1/support/tickets/$ticketId');
    if (response.data != null && response.data['SUCCESS'] == true) {
      return SupportTicketModel.fromJson(response.data['MESSAGE']);
    }
    throw Exception('Failed to load ticket details');
  }

  @override
  Future<SupportMessageModel> addMessage(String ticketId, String content) async {
    final response = await dioClient.dio.post('/api/v1/support/tickets/$ticketId/messages', data: {
      'content': content,
      'messageType': 'text',
    });

    if (response.data != null && response.data['SUCCESS'] == true) {
      return SupportMessageModel.fromJson(response.data['MESSAGE']);
    }
    throw Exception('Failed to send message');
  }

  @override
  Future<void> submitCsat(String ticketId, int rating, {String? feedback, String? tags}) async {
    await dioClient.dio.post('/api/v1/support/tickets/$ticketId/csat', data: {
      'rating': rating,
      'feedback': feedback,
      'tags': tags,
    });
  }
}
