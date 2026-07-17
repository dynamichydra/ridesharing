import 'package:dio/dio.dart';

/// Typed application exceptions. Every network failure is mapped to one of
/// these via [AppException.fromDioException] instead of being rethrown as a
/// bare `Exception(String)`, so callers (Blocs) can react to *what kind* of
/// failure occurred, not just its message.
sealed class AppException implements Exception {
  final String message;
  const AppException(this.message);

  @override
  String toString() => message;
}

/// No connectivity / connect / receive timeout — the request never reached
/// the server or never came back.
class NetworkException extends AppException {
  const NetworkException([super.message = 'Unable to connect. Check your internet connection.']);
}

/// 401 — the access token is missing, expired, or was rejected after refresh.
class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Session expired. Please log in again.']);
}

/// Any other 4xx — the server rejected the request as invalid (validation,
/// rate limit, conflict, etc). [message] carries the backend's own text.
class ServerException extends AppException {
  final int? statusCode;
  const ServerException(super.message, {this.statusCode});
}

/// 5xx or anything unexpected that doesn't fit the categories above.
class UnknownException extends AppException {
  const UnknownException([super.message = 'Something went wrong. Please try again.']);
}

/// Centralizes DioException -> AppException mapping so every datasource
/// stops hand-rolling its own try/catch/print block per method.
AppException mapDioException(DioException e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
    case DioExceptionType.transformTimeout:
      return const NetworkException();
    case DioExceptionType.badCertificate:
      return const NetworkException('A secure connection could not be established.');
    case DioExceptionType.cancel:
      return const UnknownException('Request was cancelled.');
    case DioExceptionType.badResponse:
      final statusCode = e.response?.statusCode;
      final serverMessage = _extractServerMessage(e.response?.data);
      if (statusCode == 401) return UnauthorizedException(serverMessage ?? 'Session expired. Please log in again.');
      if (statusCode != null && statusCode >= 500) {
        return UnknownException(serverMessage ?? 'Server error. Please try again later.');
      }
      return ServerException(serverMessage ?? 'Request failed.', statusCode: statusCode);
    case DioExceptionType.unknown:
      return UnknownException(e.message ?? 'Something went wrong. Please try again.');
  }
}

String? _extractServerMessage(dynamic data) {
  if (data is Map && data['MESSAGE'] is String) return data['MESSAGE'] as String;
  return null;
}
