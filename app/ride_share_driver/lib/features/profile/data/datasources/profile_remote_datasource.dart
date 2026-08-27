import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';

class ProfileRemoteDataSource {
  final ApiClient apiClient;

  ProfileRemoteDataSource({required this.apiClient});

  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await apiClient.dio.get('/drivers/profile');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load profile');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> getDashboardSummary() async {
    try {
      final response = await apiClient.dio.get('/drivers/dashboard-summary');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load dashboard summary');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> updates) async {
    try {
      final response = await apiClient.dio.patch('/drivers/profile', data: updates);
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to update profile');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<dynamic>> getDocuments() async {
    try {
      final response = await apiClient.dio.get('/documents/mine');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load documents');
      }
      return data['MESSAGE'] as List<dynamic>? ?? [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> uploadDocument(
    String documentTypeId, {
    String? documentNumber,
    String? expiryDate,
    String? key,
    String side = 'front',
  }) async {
    try {
      final response = await apiClient.dio.post(
        '/documents/$documentTypeId',
        data: {
          'side': side,
          'key': key ?? 'doc_mock_${DateTime.now().millisecondsSinceEpoch}',
          if (documentNumber != null && documentNumber.isNotEmpty) 'documentNumber': documentNumber,
          if (expiryDate != null && expiryDate.isNotEmpty) 'expiryDate': expiryDate,
        },
      );
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to upload document');
      }
      return (data['MESSAGE'] is Map<String, dynamic>) ? data['MESSAGE'] as Map<String, dynamic> : data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
