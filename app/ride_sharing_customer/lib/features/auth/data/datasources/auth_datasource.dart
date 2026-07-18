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

    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 800));
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
    final phone = _pendingPhone ?? '+919876543210';

    await Future.delayed(const Duration(milliseconds: 800));

    final token = 'mock_access_token_12345';
    final userId = 'usr_mock_customer_99';

    await _storageService.saveToken(token);
    await _storageService.saveUserId(userId);

    return {
      'isNew': true,
      'user': {
        'id': userId,
        'name': '',
        'email': '',
        'phone': phone,
      },
    };
  }

  @override
  Future<void> registerProfileDetails(String name, String email) async {
    await Future.delayed(const Duration(milliseconds: 800));
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
  }
}


