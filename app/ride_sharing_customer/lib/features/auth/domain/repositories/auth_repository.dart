abstract class AuthRepository {
  Future<void> login(String phone);
  Future<void> signup(String name, String email, String phone, String password);
  Future<bool> verifyOtp(String code);
  Future<void> registerProfileDetails(String name, String email);
  Future<void> sendForgotPasswordEmail(String email);
  Future<void> logout();
  Future<bool> checkAuthStatus();
}
