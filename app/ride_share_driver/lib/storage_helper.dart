import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageHelper {
  static const _secureStorage = FlutterSecureStorage();
  
  static const String _tokenKey = 'driver_auth_token';
  static const String _refreshTokenKey = 'driver_refresh_token';
  static const String _userIdKey = 'driver_user_id';
  static const String _phoneKey = 'driver_phone_number';

  static Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  static Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  static Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  static Future<void> saveUserId(String id) async {
    await _secureStorage.write(key: _userIdKey, value: id);
  }

  static Future<String?> getUserId() async {
    return await _secureStorage.read(key: _userIdKey);
  }

  static Future<void> savePhone(String phone) async {
    await _secureStorage.write(key: _phoneKey, value: phone);
  }

  static Future<String?> getPhone() async {
    return await _secureStorage.read(key: _phoneKey);
  }

  static Future<void> clearAll() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _userIdKey);
    await _secureStorage.delete(key: _phoneKey);
  }
}
