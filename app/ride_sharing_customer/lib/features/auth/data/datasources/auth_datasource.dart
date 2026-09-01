import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';

abstract class AuthDataSource {
  Future<void> login(String phone);
  Future<Map<String, dynamic>> signup(String name, String email, String phone, String password);
  Future<Map<String, dynamic>> verifyOtp(String code);
  Future<void> registerProfileDetails(String name, String email);
  Future<void> sendForgotPasswordEmail(String email);
  Future<void> logout();
}

class AuthDataSourceImpl implements AuthDataSource {
  final DioClient _dioClient;
  final StorageService _storageService;

  String? _pendingPhone;

  AuthDataSourceImpl(this._dioClient, this._storageService);

  @override
  Future<void> login(String phone) async {
    if (phone.isEmpty) {
      throw Exception('Please enter your phone number.');
    }
    _pendingPhone = phone;

    try {
      final response = await _dioClient.dio.post('/api/v1/auth/rider/send-otp', data: {
        'phone': phone,
      });

      if (response.data['SUCCESS'] != true) {
        throw Exception(response.data['MESSAGE'] ?? 'Failed to send OTP.');
      }
    } catch (e) {
      if (e is DioException) {
        if (e.response != null) {
          final msg = e.response?.data is Map
              ? (e.response?.data['MESSAGE'] ?? e.response?.data['message'] ?? 'Failed to send OTP.')
              : 'Failed to send OTP.';
          throw Exception(msg);
        }
      }
      throw Exception('Unable to connect to server. Please check your internet connection.');
    }
  }

  @override
  Future<Map<String, dynamic>> signup(String name, String email, String phone, String password) async {
    await login(phone);
    return {
      'name': name,
      'email': email,
      'phone': phone,
    };
  }

  @override
  Future<Map<String, dynamic>> verifyOtp(String code) async {
    final phone = _pendingPhone ?? '';
    if (phone.isEmpty) {
      throw Exception('Phone number not found. Please log in again.');
    }

    try {
      final countryCode = _storageService.getCountryCode();
      final countryName = countryCode == 'CA' ? 'Canada' : 'India';

      final response = await _dioClient.dio.post('/api/v1/auth/rider/verify-otp', data: {
        'phone': phone,
        'otp': code,
        'countryCode': countryCode,
        'country': countryName,
      });

      if (response.data['SUCCESS'] == true) {
        final data = response.data['MESSAGE'];
        final token = data['accessToken'] ?? '';
        final refreshToken = data['refreshToken'] ?? '';
        final user = data['user'] ?? {};
        final userId = user['id'] ?? '';
        final isNew = data['isNew'] ?? false;
        final country = data['country'];

        if (token.isNotEmpty) {
          await _storageService.saveToken(token);
        }
        if (refreshToken.isNotEmpty) {
          await _storageService.saveRefreshToken(refreshToken);
        }
        if (userId.isNotEmpty) {
          await _storageService.saveUserId(userId);
        }
        if (country is Map && country['isoCode'] != null) {
          await _storageService.setCountryCode(country['isoCode'].toString().toUpperCase());
        }

        // If user has empty name or email, treat as new/incomplete registration
        final nameEmpty = (user['name'] ?? '').toString().trim().isEmpty;
        final emailEmpty = (user['email'] ?? '').toString().trim().isEmpty;

        return {
          'isNew': isNew || nameEmpty || emailEmpty,
          'user': user,
        };
      } else {
        throw Exception(response.data['MESSAGE'] ?? 'Invalid OTP code.');
      }
    } catch (e) {
      if (e is DioException) {
        if (e.response != null) {
          final msg = e.response?.data is Map
              ? (e.response?.data['MESSAGE'] ?? e.response?.data['message'] ?? 'Invalid or expired OTP.')
              : 'Invalid or expired OTP.';
          throw Exception(msg);
        }
      }
      throw Exception('Unable to connect to server. Please check your internet connection.');
    }
  }

  @override
  Future<void> registerProfileDetails(String name, String email) async {
    try {
      final countryCode = _storageService.getCountryCode();
      final countryName = countryCode == 'CA' ? 'Canada' : 'India';

      final response = await _dioClient.dio.patch('/api/v1/riders/profile', data: {
        'name': name,
        'email': email,
        'countryCode': countryCode,
        'country': countryName,
      });
      if (response.data['SUCCESS'] != true) {
        throw Exception(response.data['MESSAGE'] ?? 'Failed to complete profile registration.');
      }
    } catch (e) {
      if (e is DioException) {
        if (e.response != null) {
          final msg = e.response?.data is Map
              ? (e.response?.data['MESSAGE'] ?? e.response?.data['message'] ?? 'Failed to complete profile registration.')
              : 'Failed to complete profile registration.';
          throw Exception(msg);
        }
      }
      throw Exception('Unable to connect to server. Please check your internet connection.');
    }
  }

  @override
  Future<void> sendForgotPasswordEmail(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  @override
  Future<void> logout() async {
    try {
      await _dioClient.dio.post('/api/v1/auth/logout');
    } catch (_) {}
    await _storageService.clearAuth();
  }
}



