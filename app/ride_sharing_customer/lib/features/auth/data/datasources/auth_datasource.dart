import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/constants/constants.dart';

abstract class AuthDataSource {
  Future<Map<String, dynamic>> login(String email, String password);
  Future<Map<String, dynamic>> signup(String name, String email, String phone, String password);
  Future<void> verifyOtp(String code);
  Future<void> sendForgotPasswordEmail(String email);
}

class AuthDataSourceImpl implements AuthDataSource {
  final DioClient _dioClient;
  final StorageService _storageService;

  AuthDataSourceImpl(this._dioClient, this._storageService);

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    if (email.isEmpty || password.isEmpty) {
      throw Exception('Please enter both email and password.');
    }

    final response = await _dioClient.getMockData(AppMockAssets.users);
    final Map<String, dynamic> userProfile = Map<String, dynamic>.from(response);
    
    // Dynamically bind the entered email if valid
    if (email.contains('@')) {
      userProfile['email'] = email;
    }
    
    await _storageService.saveToken(userProfile['token'] as String);
    await _storageService.saveUserId(userProfile['id'] as String);
    return userProfile;
  }

  @override
  Future<Map<String, dynamic>> signup(String name, String email, String phone, String password) async {
    await Future.delayed(const Duration(milliseconds: 500));
    
    final newUser = {
      'id': 'usr_new_user_999',
      'name': name,
      'email': email,
      'phone': phone,
      'rating': 5.0,
      'profile_picture': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      'token': 'mock_jwt_token_new_user_999'
    };

    await _storageService.saveToken(newUser['token'] as String);
    await _storageService.saveUserId(newUser['id'] as String);
    return newUser;
  }

  @override
  Future<void> verifyOtp(String code) async {
    await Future.delayed(const Duration(milliseconds: 500));
    if (code != '123456') {
      throw Exception('Incorrect OTP code. Please enter 123456.');
    }
  }

  @override
  Future<void> sendForgotPasswordEmail(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
    if (email.isEmpty || !email.contains('@')) {
      throw Exception('Please enter a valid email address.');
    }
  }
}
