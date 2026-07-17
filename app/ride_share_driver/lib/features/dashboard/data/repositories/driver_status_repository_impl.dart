import '../../domain/repositories/driver_status_repository.dart';
import '../datasources/driver_status_remote_datasource.dart';

class DriverStatusRepositoryImpl implements DriverStatusRepository {
  final DriverStatusRemoteDataSource remoteDataSource;

  DriverStatusRepositoryImpl({required this.remoteDataSource});

  @override
  Future<void> goOnline({required double lat, required double lng}) {
    return remoteDataSource.goOnline(lat: lat, lng: lng);
  }

  @override
  Future<void> goOffline() {
    return remoteDataSource.goOffline();
  }
}
