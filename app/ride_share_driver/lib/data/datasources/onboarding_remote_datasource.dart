import 'dart:io';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';

class OnboardingRemoteDataSource {
  final ApiClient apiClient;

  OnboardingRemoteDataSource({required this.apiClient});

  Future<Map<String, dynamic>> getProfile() async {
    final response = await apiClient.dio.get('/drivers/profile');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load profile');
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final response = await apiClient.dio.patch('/drivers/profile', data: data);
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to update profile');
  }

  Future<Map<String, dynamic>> getOnboardingConfig() async {
    final response = await apiClient.dio.get('/onboarding/config');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load onboarding configuration');
  }

  Future<List<dynamic>> getStates(String countryId) async {
    final response = await apiClient.dio.get('/geo/countries/$countryId/states');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load states');
  }

  Future<List<dynamic>> getCities(String stateId) async {
    final response = await apiClient.dio.get('/geo/states/$stateId/cities');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load cities');
  }

  Future<bool> setDrivingLocation(String countryId, String stateId, String cityId) async {
    final response = await apiClient.dio.put('/drivers/driving-location', data: {
      'countryId': countryId,
      'stateId': stateId,
      'cityId': cityId,
    });
    return response.data['SUCCESS'] == true;
  }

  Future<Map<String, dynamic>> acceptLegalDocument(String documentId) async {
    final response = await apiClient.dio.post('/onboarding/legal/accept', data: {
      'legalDocumentId': documentId,
    });
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to accept terms');
  }

  Future<List<dynamic>> getMyDocuments() async {
    final response = await apiClient.dio.get('/documents/mine');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load documents');
  }

  Future<Map<String, dynamic>> requestUploadUrl(String documentTypeId, String side, String contentType) async {
    final response = await apiClient.dio.post('/documents/$documentTypeId/upload-url', data: {
      'side': side,
      'contentType': contentType,
    });
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to get upload URL');
  }

  Future<bool> uploadDocumentFile(String uploadUrl, List<int> bytes, String contentType) async {
    final dio = Dio();
    final response = await dio.put(
      uploadUrl,
      data: Stream.fromIterable([bytes]),
      options: Options(
        headers: {
          HttpHeaders.contentTypeHeader: contentType,
          HttpHeaders.contentLengthHeader: bytes.length,
        },
      ),
    );
    return response.statusCode == 200;
  }

  Future<Map<String, dynamic>> confirmDocument(String documentTypeId, String side, String key, {String? documentNumber, String? expiryDate}) async {
    final response = await apiClient.dio.post('/documents/$documentTypeId', data: {
      'side': side,
      'key': key,
      if (documentNumber != null) 'documentNumber': documentNumber,
      if (expiryDate != null) 'expiryDate': expiryDate,
    });
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to confirm document upload');
  }

  Future<Map<String, dynamic>> requestProfilePhotoUploadUrl(String contentType) async {
    final response = await apiClient.dio.post('/drivers/profile-photo/upload-url', data: {
      'contentType': contentType,
    });
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to get profile photo upload URL');
  }

  Future<Map<String, dynamic>> confirmProfilePhoto(String key) async {
    final response = await apiClient.dio.post('/drivers/profile-photo', data: {
      'key': key,
    });
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to confirm profile photo');
  }

  Future<List<dynamic>> getMyVehicles() async {
    final response = await apiClient.dio.get('/vehicles/mine');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load vehicles');
  }

  Future<Map<String, dynamic>> addVehicle(Map<String, dynamic> data) async {
    final response = await apiClient.dio.post('/vehicles', data: data);
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to add vehicle');
  }

  Future<List<dynamic>> getMyAnswers() async {
    final response = await apiClient.dio.get('/onboarding/answers/mine');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to get answers');
  }

  Future<bool> submitAnswers(List<Map<String, dynamic>> answers) async {
    final response = await apiClient.dio.post('/onboarding/answers', data: {
      'answers': answers,
    });
    return response.data['SUCCESS'] == true;
  }

  Future<Map<String, dynamic>> getRegistrationSummary() async {
    final response = await apiClient.dio.get('/drivers/registration-summary');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load registration summary');
  }

  Future<Map<String, dynamic>> getOnboardingState() async {
    final response = await apiClient.dio.get('/onboarding/state');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to load onboarding state');
  }

  /// Fetches the raw HTML/text body of a legal document's `contentUrl`.
  /// Deliberately uses a bare [Dio] instance, NOT [apiClient] — `contentUrl`
  /// points at an external CDN host, and routing it through the API client
  /// would attach our backend bearer token to a third-party request.
  Future<String> fetchLegalContent(String url) async {
    try {
      final response = await Dio().get<String>(
        url,
        options: Options(responseType: ResponseType.plain),
      );
      return response.data ?? '';
    } catch (_) {
      throw Exception('Failed to load document content');
    }
  }

  Future<Map<String, dynamic>> submitApplication() async {
    final response = await apiClient.dio.post('/drivers/submit-application');
    if (response.data['SUCCESS'] == true) {
      return response.data['MESSAGE'];
    }
    throw Exception('Failed to submit application');
  }
}
