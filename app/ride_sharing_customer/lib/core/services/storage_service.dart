import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';

class StorageService {
  final FlutterSecureStorage _secureStorage;
  
  static const String _tokenKey = 'auth_token';
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
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  Future<void> saveUserId(String id) async {
    await _secureStorage.write(key: _userIdKey, value: id);
  }

  Future<String?> getUserId() async {
    return await _secureStorage.read(key: _userIdKey);
  }

  Future<void> clearAuth() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userIdKey);
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
