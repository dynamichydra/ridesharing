import 'dart:io';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage.dart';

import '../../domain/repositories/auth_repository.dart';

class AuthRemoteDataSource {
  final ApiClient apiClient;
  final SecureStorage secureStorage;

  AuthRemoteDataSource({required this.apiClient, required this.secureStorage});

  Future<PhoneAuthStartResult> startPhoneAuth(String phone, String deviceId, bool isLogin) async {
    const path = '/auth/driver/send-otp';
    final body = {'phone': phone};

    print('🚀 [API CALL] POST ${apiClient.dio.options.baseUrl}$path | Body: $body');
    
    try {
      final response = await apiClient.dio.post(path, data: body);
      print('🚀 [API RESPONSE] Status: ${response.statusCode} | Data: ${response.data}');

      if (response.data['SUCCESS'] == true) {
        return PhoneAuthStartResult(
          success: true,
          isNewAccount: false,
        );
      }
      return PhoneAuthStartResult(
        success: false,
        isNewAccount: false,
        error: response.data['MESSAGE']?.toString() ?? 'Failed to request OTP',
      );
    } on DioException catch (dioErr) {
      print('❌ [API ERROR] $dioErr');
      final resp = dioErr.response;
      final msg = (resp?.data is Map) ? resp?.data['MESSAGE']?.toString() : null;
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

  Future<Map<String, dynamic>> verifyPhoneOtp(String phone, String otp, String deviceId, bool isLogin) async {
    const path = '/auth/driver/verify-otp';
    final body = {'phone': phone, 'otp': otp};

    print('🚀 [API CALL] POST ${apiClient.dio.options.baseUrl}$path | Body: $body');

    try {
      final response = await apiClient.dio.post(path, data: body);
      print('🚀 [API RESPONSE] Status: ${response.statusCode} | Data: ${response.data}');

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
      final msg = (resp?.data is Map) ? resp?.data['MESSAGE']?.toString() : null;
      throw Exception(msg ?? 'Connection failed: ${dioErr.message}');
    } catch (e) {
      print('❌ [API ERROR] $e');
      throw Exception('Unexpected error: $e');
    }
  }

  Future<bool> logout(String deviceId) async {
    try {
      final response = await apiClient.dio.post('/auth/logout', data: {
        'deviceId': deviceId,
      });
      return response.data['SUCCESS'] == true;
    } catch (_) {
      return true;
    }
  }
}
