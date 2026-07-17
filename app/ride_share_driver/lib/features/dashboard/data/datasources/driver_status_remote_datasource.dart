import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';

class DriverStatusRemoteDataSource {
  final ApiClient apiClient;

  DriverStatusRemoteDataSource({required this.apiClient});

  Future<void> goOnline({required double lat, required double lng}) async {
    try {
      final response = await apiClient.dio.post('/drivers/go-online', data: {'lat': lat, 'lng': lng});
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to go online');
      }
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> goOffline() async {
    try {
      final response = await apiClient.dio.post('/drivers/go-offline');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to go offline');
      }
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
