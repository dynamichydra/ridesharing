import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';

class StorageService {
  final FlutterSecureStorage _secureStorage;

  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _themeBox = 'theme_settings';
  static const String _themeModeKey = 'is_dark_mode';
  static const String _appCacheBox = 'app_cache';

  StorageService(this._secureStorage);

  Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(_themeBox);
    await Hive.openBox(_appCacheBox);
  }

  // Auth Secure Storage
  Future<void> saveToken(String token) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
    } catch (_) {}
  }

  Future<String?> getToken() async {
    try {
      return await _secureStorage.read(key: _tokenKey);
    } catch (e) {
      await clearAuth();
      return null;
    }
  }

  Future<void> saveRefreshToken(String refreshToken) async {
    try {
      await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
    } catch (_) {}
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _secureStorage.read(key: _refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> saveUserId(String id) async {
    try {
      await _secureStorage.write(key: _userIdKey, value: id);
    } catch (_) {}
  }

  Future<String?> getUserId() async {
    try {
      return await _secureStorage.read(key: _userIdKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearAuth() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
      await _secureStorage.delete(key: _refreshTokenKey);
      await _secureStorage.delete(key: _userIdKey);
    } catch (_) {
      try {
        await _secureStorage.deleteAll();
      } catch (_) {}
    }
  }

  // Theme Settings Hive
  bool isDarkMode() {
    final box = Hive.box(_themeBox);
    return box.get(_themeModeKey, defaultValue: false) as bool;
  }

  Future<void> setDarkMode(bool isDark) async {
    final box = Hive.box(_themeBox);
    await box.put(_themeModeKey, isDark);
  }

  // Country Settings Hive
  String getCountryCode() {
    final box = Hive.box(_themeBox);
    return box.get('selected_country_code', defaultValue: 'IN') as String;
  }

  Future<void> setCountryCode(String code) async {
    final box = Hive.box(_themeBox);
    await box.put('selected_country_code', code);
  }

  // Generic Cache helper (maps, strings, lists)
  Future<void> cacheData(String key, dynamic value) async {
    final box = Hive.box(_appCacheBox);
    await box.put(key, value);
  }

  dynamic getCachedData(String key) {
    final box = Hive.box(_appCacheBox);
    return box.get(key);
  }

  Future<void> clearCache() async {
    final box = Hive.box(_appCacheBox);
    await box.clear();
  }
}
