import 'dart:io';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage.dart';

import '../../domain/repositories/auth_repository.dart';

class AuthRemoteDataSource {
  final ApiClient apiClient;
  final SecureStorage secureStorage;

  AuthRemoteDataSource({required this.apiClient, required this.secureStorage});

  Future<PhoneAuthStartResult> startPhoneAuth(
    String phone,
    String deviceId,
    bool isLogin,
  ) async {
    final path = isLogin
        ? '/auth/driver/send-otp'
        : '/auth/driver/mobile/start';
    final body = isLogin
        ? {'phone': phone}
        : {'phone': phone, 'deviceId': deviceId};

    print(
      '🚀 [API CALL] POST ${apiClient.dio.options.baseUrl}$path | Body: $body',
    );

    try {
      final response = await apiClient.dio.post(path, data: body);
      print(
        '🚀 [API RESPONSE] Status: ${response.statusCode} | Data: ${response.data}',
      );

      if (response.data['SUCCESS'] == true) {
        final message = response.data['MESSAGE'];
        final isNew = (message is Map)
            ? (message['isNewAccount'] ?? false)
            : false;
        return PhoneAuthStartResult(success: true, isNewAccount: isNew);
      }
      return PhoneAuthStartResult(
        success: false,
        isNewAccount: false,
        error: response.data['MESSAGE']?.toString() ?? 'Failed to request OTP',
      );
    } on DioException catch (dioErr) {
      print('❌ [API ERROR] $dioErr');
      final resp = dioErr.response;
      final msg = (resp?.data is Map)
          ? resp?.data['MESSAGE']?.toString()
          : null;
      return PhoneAuthStartResult(
        success: false,
        isNewAccount: false,
        error: msg ?? 'Connection failed: ${dioErr.message}',
      );
    } catch (e) {
      print('❌ [API ERROR] $e');
      return PhoneAuthStartResult(
        success: false,
        isNewAccount: false,
        error: 'Unexpected error: $e',
      );
    }
  }

  Future<Map<String, dynamic>> verifyPhoneOtp(
    String phone,
    String otp,
    String deviceId,
    bool isLogin,
  ) async {
    final path = isLogin
        ? '/auth/driver/verify-otp'
        : '/auth/driver/mobile/verify';
    final body = isLogin
        ? {'phone': phone, 'otp': otp}
        : {'phone': phone, 'otp': otp, 'deviceId': deviceId};

    print(
      '🚀 [API CALL] POST ${apiClient.dio.options.baseUrl}$path | Body: $body',
    );

    try {
      final response = await apiClient.dio.post(path, data: body);
      print(
        '🚀 [API RESPONSE] Status: ${response.statusCode} | Data: ${response.data}',
      );

      if (response.data['SUCCESS'] == true) {
        final message = response.data['MESSAGE'];
        return {
          'token': message['accessToken'] ?? message['token'],
          'refreshToken': message['refreshToken'],
          'user': message['driver'] ?? message['user'],
        };
      }
      throw Exception(response.data['MESSAGE'] ?? 'OTP verification failed');
    } on DioException catch (dioErr) {
      print('❌ [API ERROR] $dioErr');
      final resp = dioErr.response;
      final msg = (resp?.data is Map)
          ? resp?.data['MESSAGE']?.toString()
          : null;
      throw Exception(msg ?? 'Connection failed: ${dioErr.message}');
    } catch (e) {
      print('❌ [API ERROR] $e');
      throw Exception('Unexpected error: $e');
    }
  }

  Future<bool> logout(String deviceId) async {
    try {
      final response = await apiClient.dio.post(
        '/auth/logout',
        data: {'deviceId': deviceId},
      );
      return response.data['SUCCESS'] == true;
    } catch (_) {
      return true;
    }
  }
}
