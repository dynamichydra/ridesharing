import '../../../../core/errors/failures.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_datasource.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../injection_container.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthDataSource _authDataSource;

  AuthRepositoryImpl(this._authDataSource);

  @override
  Future<void> login(String phone) async {
    try {
      await _authDataSource.login(phone);
    } catch (e) {
      throw AuthFailure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<void> signup(String name, String email, String phone, String password) async {
    try {
      await _authDataSource.signup(name, email, phone, password);
    } catch (e) {
      throw AuthFailure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<bool> verifyOtp(String code) async {
    try {
      final result = await _authDataSource.verifyOtp(code);
      final isNew = result['isNew'] as bool;
      final user = result['user'] as Map<String, dynamic>?;

      // If name or email are empty/null in backend, they still need to complete details
      final name = user?['name'] as String?;
      final email = user?['email'] as String?;
      final isProfileIncomplete = name == null || name.isEmpty || email == null || email.isEmpty;

      return isNew || isProfileIncomplete;
    } catch (e) {
      throw AuthFailure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<void> registerProfileDetails(String name, String email) async {
    try {
      await _authDataSource.registerProfileDetails(name, email);
    } catch (e) {
      throw AuthFailure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<void> sendForgotPasswordEmail(String email) async {
    try {
      await _authDataSource.sendForgotPasswordEmail(email);
    } catch (e) {
      throw AuthFailure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _authDataSource.logout();
    } catch (_) {}
    final storage = sl<StorageService>();
    await storage.clearAuth();
    await storage.clearCache();
  }

  @override
  Future<bool> checkAuthStatus() async {
    final storage = sl<StorageService>();
    final token = await storage.getToken();
    return token != null;
  }
}
