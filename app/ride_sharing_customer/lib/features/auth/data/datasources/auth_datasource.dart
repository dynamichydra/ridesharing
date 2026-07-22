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

    final response = await _dioClient.dio.post('/api/v1/auth/rider/send-otp', data: {
      'phone': phone,
    });

    if (response.data['SUCCESS'] != true) {
      throw Exception(response.data['MESSAGE'] ?? 'Failed to send OTP.');
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

    final response = await _dioClient.dio.post('/api/v1/auth/rider/verify-otp', data: {
      'phone': phone,
      'otp': code,
    });

    if (response.data['SUCCESS'] == true) {
      final data = response.data['MESSAGE'];
      final token = data['accessToken'] ?? '';
      final user = data['user'] ?? {};
      final userId = user['id'] ?? '';
      final isNew = data['isNew'] ?? false;

      if (token.isNotEmpty) {
        await _storageService.saveToken(token);
      }
      if (userId.isNotEmpty) {
        await _storageService.saveUserId(userId);
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
  }

  @override
  Future<void> registerProfileDetails(String name, String email) async {
    final response = await _dioClient.dio.patch('/api/v1/rider/profile', data: {
      'name': name,
      'email': email,
    });
    if (response.data['SUCCESS'] != true) {
      throw Exception(response.data['MESSAGE'] ?? 'Failed to complete profile registration.');
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



