import '../../../../core/network/dio_client.dart';
import '../../../../core/constants/constants.dart';
import '../models/vehicle_model.dart';

abstract class BookingDataSource {
  Future<List<VehicleModel>> getVehicles();
}

class BookingDataSourceImpl implements BookingDataSource {
  final DioClient _dioClient;

  BookingDataSourceImpl(this._dioClient);

  @override
  Future<List<VehicleModel>> getVehicles() async {
    final list = await _dioClient.getMockData(AppMockAssets.vehicles) as List<dynamic>;
    return list.map((e) => VehicleModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }
}
