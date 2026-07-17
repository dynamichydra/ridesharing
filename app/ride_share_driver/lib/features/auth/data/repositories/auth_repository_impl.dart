import '../../../../common/entities/driver_profile.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../domain/entities/phone_auth_start_result.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final SecureStorage secureStorage;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.secureStorage,
  });

  @override
  Future<bool> hasStoredSession() => secureStorage.hasToken();

  @override
  Future<DriverProfile> getCurrentDriver() async {
    final json = await remoteDataSource.getCurrentDriver();
    return DriverProfile.fromJson(json);
  }

  @override
  Future<PhoneAuthStartResult> startPhoneAuth(String phone, bool isLogin) {
    return remoteDataSource.startPhoneAuth(phone, isLogin);
  }

  @override
  Future<DriverProfile> verifyPhoneOtp(String phone, String otp, bool isLogin) async {
    final session = await remoteDataSource.verifyPhoneOtp(phone, otp, isLogin);

    await secureStorage.saveToken(session.accessToken);
    if (session.refreshToken != null) {
      await secureStorage.saveRefreshToken(session.refreshToken!);
    }

    final driver = DriverProfile.fromJson(session.driverJson);
    await secureStorage.saveUserId(driver.id);
    await secureStorage.savePhone(phone);

    return driver;
  }

  @override
  Future<bool> logout() async {
    await remoteDataSource.logout();
    await secureStorage.clearAll();
    return true;
  }
}
