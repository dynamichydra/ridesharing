import '../../../../core/errors/failures.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_datasource.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../injection_container.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthDataSource _authDataSource;

  AuthRepositoryImpl(this._authDataSource);

  @override
  Future<void> login(String email, String password) async {
    try {
      await _authDataSource.login(email, password);
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
  Future<void> verifyOtp(String code) async {
    try {
      await _authDataSource.verifyOtp(code);
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
    await storage.clearCache(); // Clean local profile cache upon logout
  }

  @override
  Future<bool> checkAuthStatus() async {
    final storage = sl<StorageService>();
    final token = await storage.getToken();
    return token != null;
  }
}
