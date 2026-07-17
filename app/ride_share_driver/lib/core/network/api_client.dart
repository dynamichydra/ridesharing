import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';
import '../../config/api_config.dart';
import '../../services/app_logger.dart';
import 'interceptors/auth_interceptor.dart';

/// Thin Dio factory. Auth/token-refresh concerns live in [AuthInterceptor],
/// not here — this class only owns transport configuration.
class ApiClient {
  final Dio dio = Dio();
  final SecureStorage secureStorage;

  ApiClient({required this.secureStorage}) {
    dio.options.baseUrl = ApiConfig.baseUrl;
    dio.options.connectTimeout = ApiConfig.connectTimeout;
    dio.options.receiveTimeout = ApiConfig.receiveTimeout;

    dio.interceptors.addAll([
      AuthInterceptor(secureStorage: secureStorage),
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (obj) => AppLogger.d(obj.toString()),
      ),
    ]);
  }
}
