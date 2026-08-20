import 'dart:io';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import '../services/storage_service.dart';
import '../services/app_logger.dart';
import '../../injection_container.dart';

class DioClient {
  final Dio dio;

  DioClient(this.dio) {
    dio.options.baseUrl = baseUrl;
    dio.options.connectTimeout = const Duration(seconds: 15);
    dio.options.receiveTimeout = const Duration(seconds: 15);
    
    dio.interceptors.addAll([
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final storage = sl<StorageService>();
          final token = await storage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/api/v1/auth/refresh') &&
              !error.requestOptions.path.contains('/api/v1/auth/rider/verify-otp')) {
            try {
              final storage = sl<StorageService>();
              final refreshToken = await storage.getRefreshToken();
              if (refreshToken != null && refreshToken.isNotEmpty) {
                final refreshResponse = await dio.post(
                  '/api/v1/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );
                if (refreshResponse.data['SUCCESS'] == true) {
                  final newToken = refreshResponse.data['MESSAGE']['accessToken'];
                  if (newToken != null && newToken.toString().isNotEmpty) {
                    await storage.saveToken(newToken);
                    final opts = error.requestOptions;
                    opts.headers['Authorization'] = 'Bearer $newToken';
                    final cloneReq = await dio.fetch(opts);
                    return handler.resolve(cloneReq);
                  }
                }
              }
            } catch (_) {}
          }
          return handler.next(error);
        },
      ),
      LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true,
        responseHeader: false,
        responseBody: true,
        error: true,
        logPrint: (obj) => AppLogger.d(obj.toString()),
      ),
    ]);
  }

  /// Platform-aware local API URL (Android emulator vs iOS/web/desktop)
  static String get baseUrl =>
      Platform.isAndroid ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
      // Platform.isAndroid ? 'https://rideshareapi.dokume.in/' : 'https://rideshareapi.dokume.in/';


  /// Retained mock data fallback for unimplemented APIs
  Future<dynamic> getMockData(String assetPath) async {
    try {
      final jsonStr = await rootBundle.loadString(assetPath);
      return json.decode(jsonStr);
    } catch (e) {
      return {};
    }
  }
}
