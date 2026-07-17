import 'dart:io';

/// Central place for environment-dependent API settings. Nothing in the
/// networking layer should hardcode a host, port, or timeout inline.
class ApiConfig {
  const ApiConfig._();

  /// `10.0.2.2` is the Android emulator's alias for the host machine's
  /// `localhost` — a physical device or a staging/prod build must override
  /// this via `--dart-define=API_BASE_URL=...` rather than editing this file.
  static const String _overrideBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_overrideBaseUrl.isNotEmpty) return _overrideBaseUrl;
    return Platform.isAndroid ? 'http://10.0.2.2:3000/api/v1' : 'http://localhost:3000/api/v1';
  }

  /// Socket.IO is mounted directly on the raw HTTP server (see
  /// `backend/src/sockets/index.js`), NOT under the `/api/v1` REST prefix —
  /// this strips that prefix off of [baseUrl] rather than duplicating the
  /// host/port logic.
  static String get socketBaseUrl {
    final uri = Uri.parse(baseUrl);
    return uri.replace(path: '', query: '').toString();
  }

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 10);
}
