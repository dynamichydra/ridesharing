import '../../../../common/entities/driver_profile.dart';
import '../entities/phone_auth_start_result.dart';

abstract class AuthRepository {
  /// Cheap local check — is there a token stored at all? Used to decide
  /// whether app start should attempt a session restore.
  Future<bool> hasStoredSession();

  /// Validates the stored session against the backend and returns the
  /// current driver. Throws if the session is no longer valid.
  Future<DriverProfile> getCurrentDriver();

  Future<PhoneAuthStartResult> startPhoneAuth(String phone, bool isLogin);

  Future<DriverProfile> verifyPhoneOtp(String phone, String otp, bool isLogin);

  Future<bool> logout();
}
