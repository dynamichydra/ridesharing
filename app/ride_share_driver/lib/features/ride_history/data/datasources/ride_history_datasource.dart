import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';

class RideHistoryDataSource {
  final ApiClient apiClient;

  RideHistoryDataSource({required this.apiClient});

  /// GET /api/v1/rides/driver/history?page=&limit=&status=&fromDate=&toDate=&minEarnings=&maxEarnings=
  Future<Map<String, dynamic>> getRideHistory({
    int page = 1,
    int limit = 20,
    String? status,
    String? fromDate,
    String? toDate,
    double? minEarnings,
    double? maxEarnings,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (status != null && status.isNotEmpty && status.toLowerCase() != 'all')
          'status': status.toLowerCase(),
        if (fromDate != null && fromDate.isNotEmpty) 'fromDate': fromDate,
        if (toDate != null && toDate.isNotEmpty) 'toDate': toDate,
        if (minEarnings != null) 'minEarnings': minEarnings,
        if (maxEarnings != null) 'maxEarnings': maxEarnings,
      };
      final response = await apiClient.dio.get('/rides/driver/history', queryParameters: queryParams);
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load ride history');
      }
      return data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
