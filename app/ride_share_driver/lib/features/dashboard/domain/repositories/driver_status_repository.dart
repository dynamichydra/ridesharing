abstract class DriverStatusRepository {
  Future<void> goOnline({required double lat, required double lng});
  Future<void> goOffline();
}
