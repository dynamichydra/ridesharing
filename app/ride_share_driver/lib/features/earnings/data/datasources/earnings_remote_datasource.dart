import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';
import '../models/earnings_model.dart';
import '../models/commission_status_model.dart';

class EarningsRemoteDataSource {
  final ApiClient apiClient;

  EarningsRemoteDataSource({required this.apiClient});

  /// GET /api/v1/drivers/commission-status
  Future<CommissionStatusModel> getCommissionStatus() async {
    try {
      final response = await apiClient.dio.get('/drivers/commission-status');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load commission status');
      }
      final payload = data['MESSAGE'] as Map<String, dynamic>;
      return CommissionStatusModel.fromJson(payload);
    } on DioException catch (e) {
      throw mapDioException(e);
    } catch (_) {
      return CommissionStatusModel.fallback();
    }
  }

  /// GET /api/v1/drivers/earnings?period=daily|weekly|monthly&weekOffset=0&monthOffset=0
  Future<EarningsDataModel> getEarnings({
    required String period,
    int weekOffset = 0,
    int monthOffset = 0,
  }) async {
    try {
      final response = await apiClient.dio.get(
        '/drivers/earnings',
        queryParameters: {
          'period': period,
          'weekOffset': weekOffset,
          'monthOffset': monthOffset,
        },
      );

      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load earnings');
      }

      final payload = data['MESSAGE'] as Map<String, dynamic>;

      int parseInt(dynamic val) {
        if (val == null) return 0;
        if (val is num) return val.toInt();
        return int.tryParse(val.toString()) ?? 0;
      }

      double parseDouble(dynamic val, double fallback) {
        if (val == null) return fallback;
        if (val is num) return val.toDouble();
        return double.tryParse(val.toString()) ?? fallback;
      }

      final rawHistory = payload['historyItems'] as List? ?? [];
      final historyItems = rawHistory.map((item) {
        final map = Map<String, dynamic>.from(item as Map);
        return DayEarningItem(
          title: map['title']?.toString() ?? '',
          dateSubtitle: map['dateSubtitle']?.toString(),
          isToday: map['isToday'] == true,
          trips: parseInt(map['trips']),
          amount: map['amount']?.toString() ?? '₹0.00',
        );
      }).toList();

      return EarningsDataModel(
        totalEarnings: payload['totalEarnings']?.toString() ?? '₹0.00',
        growthPercent: payload['growthPercent']?.toString() ?? '0.0%',
        growthPeriod: payload['growthPeriod']?.toString() ?? '',
        cashCollected: payload['cashCollected']?.toString() ?? '₹0.00',
        incentivesAmount: payload['incentivesAmount']?.toString() ?? '₹0.00',
        trips: parseInt(payload['trips']),
        onlineHours: payload['onlineHours']?.toString() ?? '0m',
        avgPerTrip: payload['avgPerTrip']?.toString() ?? '₹0.00',
        cashPercent: parseDouble(payload['cashPercent'], 50.0),
        walletPercent: parseDouble(payload['walletPercent'], 50.0),
        fareAmount: payload['fareAmount']?.toString() ?? '₹0.00',
        incentives: payload['incentives']?.toString() ?? '₹0.00',
        otherEarnings: payload['otherEarnings']?.toString() ?? '₹0.00',
        grossEarnings: payload['grossEarnings']?.toString() ?? '₹0.00',
        deductions: payload['deductions']?.toString() ?? '₹0.00',
        netEarnings: payload['netEarnings']?.toString() ?? '₹0.00',
        listTitle: payload['listTitle']?.toString() ?? 'Last 7 Days',
        historyItems: historyItems,
      );
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> getIncentiveProgress() async {
    try {
      final response = await apiClient.dio.get('/drivers/incentives/progress');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load incentive progress');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> claimIncentive(String campaignId, String ruleId) async {
    try {
      final response = await apiClient.dio.post('/drivers/incentives/$campaignId/claim', data: {
        'ruleId': ruleId,
      });
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to claim incentive');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> getDriverPerformance() async {
    try {
      final response = await apiClient.dio.get('/drivers/performance');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load performance metrics');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
