import '../entities/driver.dart';

abstract class AuthRepository {
  Future<bool> startPhoneAuth(String phone, String deviceId);
  Future<DriverProfile> verifyPhoneOtp(String phone, String otp, String deviceId);
  Future<bool> logout(String deviceId);
}
