import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const String _tokenKey = 'driver_auth_token';
  static const String _refreshTokenKey = 'driver_refresh_token';
  static const String _userIdKey = 'driver_user_id';
  static const String _phoneKey = 'driver_phone_number';
  static const String _languageCodeKey = 'driver_language_code';
  static const String _deviceIdKey = 'driver_device_id';
  static const String _onlineStatusKey = 'driver_is_online';

  Future<void> saveOnlineStatus(bool isOnline) async {
    try {
      await _storage.write(key: _onlineStatusKey, value: isOnline ? 'true' : 'false');
    } catch (_) {}
  }

  Future<bool?> getOnlineStatus() async {
    try {
      final val = await _storage.read(key: _onlineStatusKey);
      if (val == null) return null;
      return val == 'true';
    } catch (e) {
      return null;
    }
  }

  Future<void> saveToken(String token) async {
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (_) {}
  }

  Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      await clearAll();
      return null;
    }
  }

  /// Whether a token is stored at all — cheap, storage-only check used to
  /// decide whether cold start should attempt a session restore.
  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> saveRefreshToken(String token) async {
    try {
      await _storage.write(key: _refreshTokenKey, value: token);
    } catch (_) {}
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> saveUserId(String id) async {
    try {
      await _storage.write(key: _userIdKey, value: id);
    } catch (_) {}
  }

  Future<String?> getUserId() async {
    try {
      return await _storage.read(key: _userIdKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> savePhone(String phone) async {
    try {
      await _storage.write(key: _phoneKey, value: phone);
    } catch (_) {}
  }

  Future<String?> getPhone() async {
    try {
      return await _storage.read(key: _phoneKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> saveLanguageCode(String code) async {
    try {
      await _storage.write(key: _languageCodeKey, value: code);
    } catch (_) {}
  }

  Future<String?> getLanguageCode() async {
    try {
      return await _storage.read(key: _languageCodeKey);
    } catch (e) {
      return null;
    }
  }

  /// Per-install identifier for device-scoped backend sessions. Deliberately
  /// NOT cleared by [clearAll] — it identifies the installation, not a
  /// signed-in session, and must survive logout/login so the backend keeps
  /// recognizing this as the same device.
  Future<void> saveDeviceId(String deviceId) async {
    try {
      await _storage.write(key: _deviceIdKey, value: deviceId);
    } catch (_) {}
  }

  Future<String?> getDeviceId() async {
    try {
      return await _storage.read(key: _deviceIdKey);
    } catch (e) {
      return null;
    }
  }

  /// Clears session data on logout/failed session restore. Does not touch
  /// [_deviceIdKey] — see [saveDeviceId].
  Future<void> clearAll() async {
    try {
      await _storage.delete(key: _tokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _userIdKey);
      await _storage.delete(key: _phoneKey);
      await _storage.delete(key: _languageCodeKey);
    } catch (_) {
      try {
        await _storage.deleteAll();
      } catch (_) {}
    }
  }
}
