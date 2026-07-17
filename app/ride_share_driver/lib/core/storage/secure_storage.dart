import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _tokenKey = 'driver_auth_token';
  static const String _refreshTokenKey = 'driver_refresh_token';
  static const String _userIdKey = 'driver_user_id';
  static const String _phoneKey = 'driver_phone_number';
  static const String _languageCodeKey = 'driver_language_code';
  static const String _deviceIdKey = 'driver_device_id';

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  /// Whether a token is stored at all — cheap, storage-only check used to
  /// decide whether cold start should attempt a session restore.
  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  Future<void> saveUserId(String id) async {
    await _storage.write(key: _userIdKey, value: id);
  }

  Future<String?> getUserId() async {
    return await _storage.read(key: _userIdKey);
  }

  Future<void> savePhone(String phone) async {
    await _storage.write(key: _phoneKey, value: phone);
  }

  Future<String?> getPhone() async {
    return await _storage.read(key: _phoneKey);
  }

  Future<void> saveLanguageCode(String code) async {
    await _storage.write(key: _languageCodeKey, value: code);
  }

  Future<String?> getLanguageCode() async {
    return await _storage.read(key: _languageCodeKey);
  }

  /// Per-install identifier for device-scoped backend sessions. Deliberately
  /// NOT cleared by [clearAll] — it identifies the installation, not a
  /// signed-in session, and must survive logout/login so the backend keeps
  /// recognizing this as the same device.
  Future<void> saveDeviceId(String deviceId) async {
    await _storage.write(key: _deviceIdKey, value: deviceId);
  }

  Future<String?> getDeviceId() async {
    return await _storage.read(key: _deviceIdKey);
  }

  /// Clears session data on logout/failed session restore. Does not touch
  /// [_deviceIdKey] — see [saveDeviceId].
  Future<void> clearAll() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshTokenKey);
    await _storage.delete(key: _userIdKey);
    await _storage.delete(key: _phoneKey);
    await _storage.delete(key: _languageCodeKey);
  }
}
