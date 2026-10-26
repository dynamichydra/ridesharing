import 'dart:io';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import '../services/storage_service.dart';
import '../region/region_guard.dart';
import '../../injection_container.dart';

import 'interceptors/http_log_interceptor.dart';

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
          // India/Canada region lock: the server rejects rider calls (and OTP login) without a
          // fresh region token. RegionGuard re-verifies when the cached one is near expiry.
          final regionToken = await sl<RegionGuard>().validToken();
          if (regionToken != null) {
            options.headers['X-Region-Token'] = regionToken;
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          final body = error.response?.data;
          final code = body is Map ? body['CODE']?.toString() : null;
          if (error.response?.statusCode == 403 && code != null && RegionGuard.regionErrorCodes.contains(code)) {
            final guard = sl<RegionGuard>();
            // Expired/missing token: re-check once and replay the request.
            if (code == 'REGION_CHECK_REQUIRED' && error.requestOptions.extra['regionRetried'] != true) {
              final result = await guard.verify();
              if (result.allowed) {
                final opts = error.requestOptions..extra['regionRetried'] = true;
                try {
                  return handler.resolve(await dio.fetch(opts));
                } on DioException catch (retryError) {
                  return handler.next(retryError);
                }
              }
              if (!result.needsLocationPermission) guard.reportBlocked(result);
            } else {
              guard.reportBlocked(RegionResult.blocked(code, body is Map ? body['MESSAGE']?.toString() : null));
            }
            return handler.next(error);
          }

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
      HttpLogInterceptor(),
    ]);
  }

  /// Platform-aware local API URL (Android emulator vs iOS/web/desktop)
  static String get baseUrl =>
         Platform.isAndroid ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
      // Platform.isAndroid ? 'https://rideshareapi.dokume.in' : 'https://rideshareapi.dokume.in';
      //    Platform.isAndroid ? 'https://ryva.duckdns.org' : 'https://ryva.duckdns.org';
      // Platform.isAndroid ? 'https://rideshareapi.dokume.in' : 'https://rideshareapi.dokume.in';

  /// Socket.IO base URL — just the origin, no path prefix.
  /// Socket.IO is mounted on the raw HTTP server, not under /api/v1.
  static String get socketBaseUrl => Uri.parse(baseUrl).origin;


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
