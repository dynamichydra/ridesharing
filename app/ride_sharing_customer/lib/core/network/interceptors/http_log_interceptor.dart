import 'dart:convert';
import 'package:dio/dio.dart';
import '../../services/app_logger.dart';

class HttpLogInterceptor extends Interceptor {
  final JsonEncoder _encoder = const JsonEncoder.withIndent('  ');

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final String path = options.uri.toString();
    final String method = options.method.toUpperCase();

    String logMsg = '[HTTP Request] $method $path';

    if (options.data != null) {
      final formattedData = _formatData(options.data);
      if (formattedData.isNotEmpty) {
        logMsg += '\nRequest Body:\n$formattedData';
      }
    }

    AppLogger.d(logMsg);
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final String path = response.requestOptions.uri.toString();
    final String method = response.requestOptions.method.toUpperCase();
    final int statusCode = response.statusCode ?? 0;

    String logMsg = '[HTTP Response $statusCode] $method $path';

    if (response.data != null) {
      final formattedData = _formatData(response.data);
      if (formattedData.isNotEmpty) {
        logMsg += '\nResponse Data:\n$formattedData';
      }
    }

    AppLogger.d(logMsg);
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final String path = err.requestOptions.uri.toString();
    final String method = err.requestOptions.method.toUpperCase();
    final int statusCode = err.response?.statusCode ?? 0;

    String logMsg = '[HTTP Error $statusCode] $method $path';

    if (err.message != null && err.message!.isNotEmpty) {
      logMsg += '\nError Message: ${err.message}';
    }

    if (err.response?.data != null) {
      final formattedData = _formatData(err.response!.data);
      if (formattedData.isNotEmpty) {
        logMsg += '\nResponse Data:\n$formattedData';
      }
    }

    AppLogger.e(logMsg);
    super.onError(err, handler);
  }

  String _formatData(dynamic data) {
    if (data == null) return '';
    if (data is Map || data is List) {
      try {
        return _encoder.convert(data);
      } catch (_) {
        return data.toString();
      }
    } else if (data is String) {
      if (data.isEmpty) return '';
      try {
        final decoded = json.decode(data);
        return _encoder.convert(decoded);
      } catch (_) {
        return data;
      }
    } else if (data is FormData) {
      final fields = data.fields.map((e) => '${e.key}: ${e.value}').join(', ');
      final files = data.files.map((e) => '${e.key}: ${e.value.filename}').join(', ');
      return 'FormData(fields: [$fields], files: [$files])';
    }
    return data.toString();
  }
}
