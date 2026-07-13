import '../../domain/entities/driver.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../../core/storage/secure_storage.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final SecureStorage secureStorage;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.secureStorage,
  });

  @override
  Future<PhoneAuthStartResult> startPhoneAuth(String phone, String deviceId, bool isLogin) async {
    return await remoteDataSource.startPhoneAuth(phone, deviceId, isLogin);
  }

  @override
  Future<DriverProfile> verifyPhoneOtp(String phone, String otp, String deviceId, bool isLogin) async {
    final data = await remoteDataSource.verifyPhoneOtp(phone, otp, deviceId, isLogin);
    
    final token = data['token'];
    final refreshToken = data['refreshToken'];
    final userId = data['user']['id'].toString();

    await secureStorage.saveToken(token);
    await secureStorage.saveRefreshToken(refreshToken);
    await secureStorage.saveUserId(userId);
    await secureStorage.savePhone(phone);

    return DriverProfile.fromJson(data['user']);
  }

  @override
  Future<bool> logout(String deviceId) async {
    final success = await remoteDataSource.logout(deviceId);
    if (success) {
      await secureStorage.clearAll();
    }
    return success;
  }
}
