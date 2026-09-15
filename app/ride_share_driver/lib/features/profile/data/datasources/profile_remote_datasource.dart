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

  Future<Map<String, dynamic>> getCommissionStatus() async {
    try {
      final response = await apiClient.dio.get('/drivers/commission-status');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load commission status');
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
      final results = await Future.wait([
        apiClient.dio.get('/documents/mine'),
        apiClient.dio.get('/onboarding/config').catchError(
          (_) => Response(
            requestOptions: RequestOptions(path: '/onboarding/config'),
            data: {'SUCCESS': false},
          ),
        ),
      ]);

      final docsResponse = results[0];
      final configResponse = results[1];

      final data = docsResponse.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load documents');
      }
      final docsList = data['MESSAGE'] as List<dynamic>? ?? [];

      Map<String, dynamic>? reqMap;
      if (configResponse.data is Map && configResponse.data['SUCCESS'] == true) {
        final configMsg = configResponse.data['MESSAGE'] as Map<String, dynamic>?;
        final reqsList = configMsg?['documentRequirements'] as List<dynamic>?;
        if (reqsList != null) {
          reqMap = {
            for (final r in reqsList)
              if (r is Map)
                (r['id']?.toString() ?? r['code']?.toString() ?? ''): Map<String, dynamic>.from(r),
          };
        }
      }

      return docsList.map((doc) {
        if (doc is Map<String, dynamic>) {
          final docMap = Map<String, dynamic>.from(doc);
          final docTypeId = docMap['documentTypeId']?.toString() ?? docMap['id']?.toString() ?? '';
          final code = docMap['code']?.toString() ?? '';

          if (reqMap != null) {
            final req = reqMap[docTypeId] ?? reqMap[code];
            if (req != null) {
              docMap['isRequired'] = req['isRequired'] ?? true;
              if (req['requiresFront'] != null) docMap['requiresFront'] = req['requiresFront'];
              if (req['requiresBack'] != null) docMap['requiresBack'] = req['requiresBack'];
              if (req['requiresPdf'] != null) docMap['requiresPdf'] = req['requiresPdf'];
              if (req['requiresExpiry'] != null) docMap['requiresExpiry'] = req['requiresExpiry'];
              if (req['requiresDocNumber'] != null) docMap['requiresDocNumber'] = req['requiresDocNumber'];
            }
          }

          // Dynamic expiry detection: if document has an expiry date in the past, mark status as expired
          final expiryStr = docMap['expiryDate']?.toString();
          if (expiryStr != null) {
            final expDate = DateTime.tryParse(expiryStr);
            if (expDate != null && expDate.isBefore(DateTime.now())) {
              docMap['status'] = 'expired';
            }
          }

          return docMap;
        }
        return doc;
      }).toList();
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
