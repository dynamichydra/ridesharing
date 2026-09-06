abstract class ProfileRepository {
  Future<Map<String, dynamic>> getUserProfile();
  Future<void> updateUserProfile(String name, String email, String phone);
  Future<List<Map<String, dynamic>>> getRideHistory();
  Future<void> updateSavedPlaces(List<Map<String, dynamic>> places);
  Future<Map<String, dynamic>> addSavedPlace(Map<String, dynamic> place);
  Future<Map<String, dynamic>> updateSavedPlace(String id, Map<String, dynamic> place);
  Future<void> deleteSavedPlace(String id);
  Future<void> updatePaymentMethods(List<Map<String, dynamic>> methods);
}
