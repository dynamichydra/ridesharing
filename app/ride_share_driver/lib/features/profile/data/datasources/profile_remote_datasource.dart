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

  Future<Map<String, dynamic>> requestUploadUrl(String documentTypeId, String side, String contentType) async {
    try {
      final response = await apiClient.dio.post('/documents/$documentTypeId/upload-url', data: {
        'side': side,
        'contentType': contentType,
      });
      if (response.data['SUCCESS'] == true) {
        return response.data['MESSAGE'] as Map<String, dynamic>;
      }
      throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to get upload URL');
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<bool> uploadDocumentFile(String uploadUrl, List<int> bytes, String contentType) async {
    try {
      String targetUrl = uploadUrl;
      final baseUri = Uri.tryParse(apiClient.dio.options.baseUrl);
      final uploadUri = Uri.tryParse(uploadUrl);
      if (baseUri != null && uploadUri != null) {
        if ((uploadUri.host == 'localhost' || uploadUri.host == '127.0.0.1') &&
            baseUri.host != 'localhost' &&
            baseUri.host != '127.0.0.1') {
          targetUrl = uploadUri.replace(
            scheme: baseUri.scheme,
            host: baseUri.host,
            port: baseUri.hasPort ? baseUri.port : null,
          ).toString();
        }
      }

      final directDio = Dio();
      final response = await directDio.put(
        targetUrl,
        data: Stream.fromIterable([bytes]),
        options: Options(
          headers: {
            'Content-Type': contentType,
            'Content-Length': bytes.length,
          },
        ),
      );
      return response.statusCode == 200;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> uploadDocument(
    String documentTypeId, {
    String? documentNumber,
    String? expiryDate,
    required String key,
    String side = 'front',
  }) async {
    try {
      final response = await apiClient.dio.post(
        '/documents/$documentTypeId',
        data: {
          'side': side,
          'key': key,
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

  Future<Map<String, dynamic>> requestProfilePhotoUploadUrl(String contentType) async {
    try {
      final response = await apiClient.dio.post('/drivers/profile-photo/upload-url', data: {
        'contentType': contentType,
      });
      if (response.data['SUCCESS'] == true) {
        return response.data['MESSAGE'] as Map<String, dynamic>;
      }
      throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to get upload URL');
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> confirmProfilePhoto(String key) async {
    try {
      final response = await apiClient.dio.post('/drivers/profile-photo', data: {
        'key': key,
      });
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to update profile photo');
      }
      return (data['MESSAGE'] is Map<String, dynamic>) ? data['MESSAGE'] as Map<String, dynamic> : data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
