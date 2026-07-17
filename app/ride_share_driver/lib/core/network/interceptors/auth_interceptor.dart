import 'package:dio/dio.dart';
import '../../storage/secure_storage.dart';
import '../../../services/app_logger.dart';
import '../../../config/api_config.dart';

/// Attaches the bearer token to every request and, on a 401, attempts a
/// one-shot silent refresh + retry before giving up.
///
/// The backend's `POST /auth/refresh` (see `backend/src/modules/auth/auth.service.js`)
/// returns only `{ accessToken }` — it does not rotate the refresh token —
/// so only the access token is replaced here. A previous version of this
/// interceptor read a `refreshToken` field that the backend never sends,
/// which silently broke every refresh past the access token's lifetime.
class AuthInterceptor extends Interceptor {
  final SecureStorage secureStorage;

  AuthInterceptor({required this.secureStorage});

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await secureStorage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }

    final refreshToken = await secureStorage.getRefreshToken();
    if (refreshToken == null) {
      handler.next(err);
      return;
    }

    try {
      final refreshDio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
      final response = await refreshDio.post('/auth/refresh', data: {'refreshToken': refreshToken});

      final body = response.data;
      final message = (body is Map && body['SUCCESS'] == true) ? body['MESSAGE'] : null;
      final newAccessToken = (message is Map) ? message['accessToken'] as String? : null;

      if (newAccessToken == null || newAccessToken.isEmpty) {
        await secureStorage.clearAll();
        handler.next(err);
        return;
      }

      await secureStorage.saveToken(newAccessToken);

      final retryOptions = err.requestOptions;
      retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryDio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
      final retryResponse = await retryDio.fetch(retryOptions);
      handler.resolve(retryResponse);
    } on DioException catch (retryError) {
      AppLogger.w('[AuthInterceptor] Refresh/retry failed: ${retryError.message}');
      await secureStorage.clearAll();
      handler.next(err);
    } catch (error, stackTrace) {
      AppLogger.e('[AuthInterceptor] Unexpected error during refresh', error, stackTrace);
      await secureStorage.clearAll();
      handler.next(err);
    }
  }
}
