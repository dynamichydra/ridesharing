import '../entities/driver.dart';

class PhoneAuthStartResult {
  final bool success;
  final bool isNewAccount;
  final String? error;

  PhoneAuthStartResult({
    required this.success,
    required this.isNewAccount,
    this.error,
  });
}

abstract class AuthRepository {
  Future<PhoneAuthStartResult> startPhoneAuth(String phone, String deviceId, bool isLogin);
  Future<DriverProfile> verifyPhoneOtp(String phone, String otp, String deviceId, bool isLogin);
  Future<bool> logout(String deviceId);
}
