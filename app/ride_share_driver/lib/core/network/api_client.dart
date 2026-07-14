import 'dart:io';
import 'package:flutter/foundation.dart';
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
          final url = '${options.baseUrl}${options.path}';
          final method = options.method.toUpperCase();
          final queryParameters = options.queryParameters;
          final data = options.data;

          debugPrint('------------------ 🚀 [API REQUEST] ------------------');
          debugPrint('$method $url');
          if (options.headers.isNotEmpty) {
            debugPrint('Headers: ${options.headers}');
          }
          if (queryParameters.isNotEmpty) {
            debugPrint('Query Params: $queryParameters');
          }
          if (data != null) {
            debugPrint('Payload: $data');
          }
          debugPrint('------------------------------------------------------');

          final token = await secureStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          final url =
              '${response.requestOptions.baseUrl}${response.requestOptions.path}';
          final method = response.requestOptions.method.toUpperCase();

          debugPrint('------------------ ✅ [API RESPONSE] ------------------');
          debugPrint('$method $url | Status: ${response.statusCode}');
          debugPrint('Response Body: ${response.data}');
          debugPrint('------------------------------------------------------');
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          final url = '${e.requestOptions.baseUrl}${e.requestOptions.path}';
          final method = e.requestOptions.method.toUpperCase();

          debugPrint('------------------ ❌ [API ERROR] --------------------');
          debugPrint('$method $url | Status: ${e.response?.statusCode}');
          debugPrint('Error Message: ${e.message}');
          if (e.response?.data != null) {
            debugPrint('Error Body: ${e.response?.data}');
          }
          debugPrint('------------------------------------------------------');

          if (e.response?.statusCode == 401) {
            // Attempt token refresh
            final refreshToken = await secureStorage.getRefreshToken();
            if (refreshToken != null) {
              try {
                final refreshDio = Dio(
                  BaseOptions(baseUrl: dio.options.baseUrl),
                );
                final response = await refreshDio.post(
                  '/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );
                if (response.statusCode == 200 &&
                    response.data['SUCCESS'] == true) {
                  final newToken = response.data['MESSAGE']['token'];
                  final newRefreshToken =
                      response.data['MESSAGE']['refreshToken'];
                  await secureStorage.saveToken(newToken);
                  await secureStorage.saveRefreshToken(newRefreshToken);

                  // Retry request
                  e.requestOptions.headers['Authorization'] =
                      'Bearer $newToken';
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
