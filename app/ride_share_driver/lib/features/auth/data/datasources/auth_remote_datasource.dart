import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';
import '../../../../services/device_id_service.dart';
import '../../../../services/app_logger.dart';
import '../../domain/entities/phone_auth_start_result.dart';

/// Result of a successful OTP verification, before it's been turned into a
/// [DriverProfile] / persisted — kept as a record rather than a Map so the
/// repository doesn't have to re-guess field names.
typedef VerifiedSession = ({
  String accessToken,
  String? refreshToken,
  Map<String, dynamic> driverJson,
});

class AuthRemoteDataSource {
  final ApiClient apiClient;
  final DeviceIdService deviceIdService;

  AuthRemoteDataSource({required this.apiClient, required this.deviceIdService});

  /// `isLogin: true` uses the legacy, non-device-scoped `/send-otp` path
  /// (returning driver); `isLogin: false` uses the device-scoped
  /// `/mobile/start` registration path, which requires a deviceId.
  Future<PhoneAuthStartResult> startPhoneAuth(String phone, bool isLogin) async {
    final path = isLogin ? '/auth/driver/send-otp' : '/auth/driver/mobile/start';
    final body = <String, dynamic>{'phone': phone};
    if (!isLogin) {
      body['deviceId'] = await deviceIdService.getOrCreateDeviceId();
    }

    try {
      final response = await apiClient.dio.post(path, data: body);
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        return PhoneAuthStartResult(success: false, isNewAccount: false, error: data['MESSAGE']?.toString());
      }
      final message = data['MESSAGE'];
      final isNewAccount = (message is Map) ? (message['isNewAccount'] as bool? ?? false) : false;
      return PhoneAuthStartResult(success: true, isNewAccount: isNewAccount);
    } on DioException catch (e) {
      final appException = mapDioException(e);
      AppLogger.w('[AuthRemoteDataSource] startPhoneAuth failed: $appException');
      return PhoneAuthStartResult(success: false, isNewAccount: false, error: appException.message);
    }
  }

  Future<VerifiedSession> verifyPhoneOtp(String phone, String otp, bool isLogin) async {
    final path = isLogin ? '/auth/driver/verify-otp' : '/auth/driver/mobile/verify';
    final body = <String, dynamic>{'phone': phone, 'otp': otp};
    if (!isLogin) {
      body['deviceId'] = await deviceIdService.getOrCreateDeviceId();
    }

    try {
      final response = await apiClient.dio.post(path, data: body);
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'OTP verification failed');
      }

      // Confirmed against backend/src/modules/auth/auth.service.js: both the
      // device-scoped and legacy verify paths return { accessToken, refreshToken, driver }.
      final message = data['MESSAGE'] as Map<String, dynamic>;
      final accessToken = message['accessToken'] as String?;
      final driverJson = message['driver'] as Map<String, dynamic>?;
      if (accessToken == null || driverJson == null) {
        throw const UnknownException('Login succeeded but the response was missing required fields.');
      }

      return (
        accessToken: accessToken,
        refreshToken: message['refreshToken'] as String?,
        driverJson: driverJson,
      );
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Validates + hydrates the current session. Used on cold start to decide
  /// whether a stored token is still good.
  Future<Map<String, dynamic>> getCurrentDriver() async {
    try {
      final response = await apiClient.dio.get('/drivers/profile');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw const UnknownException('Failed to load driver profile.');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Best-effort: local session data is cleared by the repository regardless
  /// of whether this network call succeeds (device offline, token already
  /// expired, etc. must not block logging out locally).
  Future<void> logout() async {
    try {
      final deviceId = await deviceIdService.getOrCreateDeviceId();
      await apiClient.dio.post('/auth/logout', data: {'deviceId': deviceId});
    } on DioException catch (e) {
      AppLogger.w('[AuthRemoteDataSource] logout request failed (continuing with local logout): ${mapDioException(e)}');
    }
  }
}
