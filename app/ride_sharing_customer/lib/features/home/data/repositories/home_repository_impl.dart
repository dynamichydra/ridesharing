import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../domain/repositories/home_repository.dart';
import '../datasources/home_datasource.dart';
import '../../../../core/errors/failures.dart';

class HomeRepositoryImpl implements HomeRepository {
  final HomeDataSource _homeDataSource;

  HomeRepositoryImpl(this._homeDataSource);

  @override
  Future<LatLng> getCurrentLocation() async {
    try {
      return await _homeDataSource.getCurrentLocation();
    } catch (e) {
      throw LocationFailure(e.toString());
    }
  }

  @override
  Future<List<Map<String, dynamic>>> searchPlaces(String query) async {
    try {
      return await _homeDataSource.searchPlaces(query);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getSavedPlaces() async {
    try {
      return await _homeDataSource.getSavedPlaces();
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }
}
