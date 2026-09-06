import '../../domain/repositories/profile_repository.dart';
import '../datasources/profile_datasource.dart';
import '../../../../core/errors/failures.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileDataSource _profileDataSource;

  ProfileRepositoryImpl(this._profileDataSource);

  @override
  Future<Map<String, dynamic>> getUserProfile() async {
    try {
      return await _profileDataSource.getUserProfile();
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<void> updateUserProfile(String name, String email, String phone) async {
    try {
      await _profileDataSource.updateUserProfile(name, email, phone);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getRideHistory() async {
    try {
      return await _profileDataSource.getRideHistory();
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<void> updateSavedPlaces(List<Map<String, dynamic>> places) async {
    try {
      await _profileDataSource.updateSavedPlaces(places);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<Map<String, dynamic>> addSavedPlace(Map<String, dynamic> place) async {
    try {
      return await _profileDataSource.addSavedPlace(place);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<Map<String, dynamic>> updateSavedPlace(String id, Map<String, dynamic> place) async {
    try {
      return await _profileDataSource.updateSavedPlace(id, place);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<void> deleteSavedPlace(String id) async {
    try {
      await _profileDataSource.deleteSavedPlace(id);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<void> updatePaymentMethods(List<Map<String, dynamic>> methods) async {
    try {
      await _profileDataSource.updatePaymentMethods(methods);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }
}
