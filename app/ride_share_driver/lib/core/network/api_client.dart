import 'dart:io';
import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  final Dio dio = Dio();
  final SecureStorage secureStorage;

  ApiClient({required this.secureStorage}) {
    dio.options.baseUrl = Platform.isAndroid
        ? 'http://10.0.2.2:3000/api/v1'
        : 'http://localhost:3000/api/v1';
    dio.options.connectTimeout = const Duration(seconds: 10);
    dio.options.receiveTimeout = const Duration(seconds: 10);

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await secureStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Attempt token refresh
            final refreshToken = await secureStorage.getRefreshToken();
            if (refreshToken != null) {
              try {
                final refreshDio = Dio(BaseOptions(baseUrl: dio.options.baseUrl));
                final response = await refreshDio.post('/auth/refresh', data: {
                  'refreshToken': refreshToken,
                });
                if (response.statusCode == 200 && response.data['SUCCESS'] == true) {
                  final newToken = response.data['MESSAGE']['token'];
                  final newRefreshToken = response.data['MESSAGE']['refreshToken'];
                  await secureStorage.saveToken(newToken);
                  await secureStorage.saveRefreshToken(newRefreshToken);
                  
                  // Retry request
                  e.requestOptions.headers['Authorization'] = 'Bearer $newToken';
                  final clonedRequest = await dio.fetch(e.requestOptions);
                  return handler.resolve(clonedRequest);
                }
              } catch (_) {
                await secureStorage.clearAll();
              }
            }
          }
          return handler.next(e);
        },
      ),
    );
  }
}
