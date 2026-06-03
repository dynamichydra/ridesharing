abstract class AuthRepository {
  Future<void> login(String email, String password);
  Future<void> signup(String name, String email, String phone, String password);
  Future<void> verifyOtp(String code);
  Future<void> sendForgotPasswordEmail(String email);
  Future<void> logout();
  Future<bool> checkAuthStatus();
}
