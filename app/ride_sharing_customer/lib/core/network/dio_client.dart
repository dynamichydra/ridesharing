import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';

class DioClient {
  final Dio dio;

  DioClient(this.dio);

  /// Simulates a GET request to a REST API by loading a mock JSON asset.
  /// Introduces artificial latency to simulate server-side processing.
  Future<dynamic> getMockData(String assetPath) async {
    await Future.delayed(const Duration(milliseconds: 500));
    try {
      final jsonStr = await rootBundle.loadString(assetPath);
      return json.decode(jsonStr);
    } catch (e) {
      throw DioException(
        requestOptions: RequestOptions(path: assetPath),
        error: 'Failed to load mock asset: $e',
        type: DioExceptionType.badResponse,
      );
    }
  }
}
