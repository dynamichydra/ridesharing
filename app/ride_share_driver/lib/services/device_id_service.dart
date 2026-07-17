import 'package:uuid/uuid.dart';
import '../core/storage/secure_storage.dart';

/// Resolves a stable per-install device identifier for device-scoped backend
/// sessions (`driver_devices` table, per-device refresh tokens/logout).
///
/// A generated-and-persisted UUID is used instead of a hardware identifier
/// (Android ID / IDFV) because it needs no extra native permissions, isn't
/// tied to platform-specific reset/privacy quirks, and is exactly what the
/// backend expects: an opaque, stable-per-install string.
class DeviceIdService {
  final SecureStorage secureStorage;
  final Uuid _uuid;

  DeviceIdService({required this.secureStorage, Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  Future<String> getOrCreateDeviceId() async {
    final existing = await secureStorage.getDeviceId();
    if (existing != null && existing.isNotEmpty) return existing;

    final generated = _uuid.v4();
    await secureStorage.saveDeviceId(generated);
    return generated;
  }
}
