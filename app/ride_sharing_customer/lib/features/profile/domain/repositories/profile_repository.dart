abstract class ProfileRepository {
  Future<Map<String, dynamic>> getUserProfile();
  Future<void> updateUserProfile(String name, String email, String phone);
  Future<List<Map<String, dynamic>>> getRideHistory();
  Future<void> updateSavedPlaces(List<Map<String, dynamic>> places);
  Future<void> updatePaymentMethods(List<Map<String, dynamic>> methods);
}
