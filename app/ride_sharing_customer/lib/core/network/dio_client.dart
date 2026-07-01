import 'dart:io';
import 'package:dio/dio.dart';
import '../services/storage_service.dart';
import '../../injection_container.dart';

class DioClient {
  final Dio dio;

  DioClient(this.dio) {
    dio.options.baseUrl = baseUrl;
    dio.options.connectTimeout = const Duration(seconds: 15);
    dio.options.receiveTimeout = const Duration(seconds: 15);
    
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final storage = sl<StorageService>();
          final token = await storage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  /// Platform-aware local API URL (Android emulator vs iOS/web/desktop)
  static String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  /// Retained mock data fallback for unimplemented APIs
  Future<dynamic> getMockData(String assetPath) async {
    // Return standard mock data
    return {};
  }
}
