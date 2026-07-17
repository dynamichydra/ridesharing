import 'package:logger/logger.dart';

/// Single shared logger so call sites stop using raw `print()`/`debugPrint()`
/// (which ship straight to a release console with no level/filtering control).
class AppLogger {
  AppLogger._();

  static final Logger _logger = Logger(
    printer: PrettyPrinter(methodCount: 0, colors: false, printEmojis: false),
  );

  static void d(String message) => _logger.d(message);
  static void i(String message) => _logger.i(message);
  static void w(String message) => _logger.w(message);
  static void e(String message, [Object? error, StackTrace? stackTrace]) =>
      _logger.e(message, error: error, stackTrace: stackTrace);
}
