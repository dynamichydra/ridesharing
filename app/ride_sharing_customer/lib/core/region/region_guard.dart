import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../services/storage_service.dart';

/// Outcome of a region check. [allowed] riders get a [countryCode] ('IN' | 'CA') and its
/// [dialCode]; blocked ones get a [code] and a user-facing [message].
class RegionResult {
  final bool allowed;
  final String? countryCode;
  final String? countryName;
  final String? dialCode;
  final String? cityName;
  final String? code;
  final String? message;

  const RegionResult.allowed({
    required this.countryCode,
    required this.countryName,
    required this.dialCode,
    this.cityName,
  })  : allowed = true,
        code = null,
        message = null;

  const RegionResult.blocked(this.code, this.message)
      : allowed = false,
        countryCode = null,
        countryName = null,
        dialCode = null,
        cityName = null;

  factory RegionResult.forCountry(String iso, {String? cityName}) => RegionResult.allowed(
        countryCode: iso,
        countryName: iso == 'CA' ? 'Canada' : 'India',
        dialCode: iso == 'CA' ? '+1' : '+91',
        cityName: cityName,
      );

  bool get isUnsupportedRegion => code == 'REGION_UNAVAILABLE';
  bool get needsLocationPermission => code == 'LOCATION_PERMISSION';
  bool get isAccountProblem => code == 'ACCOUNT_COUNTRY_MISMATCH' || code == 'ACCOUNT_BLOCKED';
}

/// BASIC region check (testing mode) — runs on the device only:
///   • quick location (last known position first, else one medium-accuracy fix, 8s max)
///   • country from rough India/Canada coordinate boxes
///   • no server call, no region token, no VPN / fake-GPS detection, no re-check on resume
///
/// It never blocks for a missing fix, missing permission or a debug build (the simulator sits
/// in the US by default) — it only picks the default country for login. Only a release build
/// with a clear fix outside India and Canada gets "not available in your location".
/// The account country is still fixed by the phone number and enforced by the server.
class RegionGuard {
  final StorageService _storage;

  RegionGuard(this._storage);

  /// Codes the API can refuse a request with; DioClient sends these to the block screen.
  static const Set<String> regionErrorCodes = {
    'REGION_UNAVAILABLE',
    'PHONE_COUNTRY_MISMATCH',
    'ACCOUNT_COUNTRY_MISMATCH',
    'ACCOUNT_BLOCKED',
  };

  RegionResult? _last;
  Future<RegionResult>? _inFlight;

  final StreamController<RegionResult> _blocked = StreamController<RegionResult>.broadcast();
  Stream<RegionResult> get onBlocked => _blocked.stream;

  RegionResult? get current => _last;

  void _log(String message) {
    if (kDebugMode) debugPrint('[RegionGuard] $message');
  }

  /// Runs the basic check. Concurrent callers share one check.
  Future<RegionResult> verify() {
    if (_inFlight != null) return _inFlight!;
    return _inFlight = _check().then((r) {
      _last = r;
      _log(r.allowed ? 'ALLOWED — ${r.countryCode} (${r.dialCode})' : 'BLOCKED — ${r.code}');
      return r;
    }).whenComplete(() => _inFlight = null);
  }

  void reportBlocked(RegionResult result) {
    _log('API refused a request: ${result.code} — "${result.message}"');
    _blocked.add(result);
  }

  /// The last country used (or India) — what login falls back to when location is unknown.
  RegionResult get _fallback =>
      RegionResult.forCountry(_storage.getCountryCode().toUpperCase() == 'CA' ? 'CA' : 'IN');

  Future<RegionResult> _check() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _log('location services off — using ${_fallback.countryCode}');
        return _fallback;
      }
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _log('no location permission — using ${_fallback.countryCode}');
        return _fallback;
      }

      final position = await _quickPosition();
      if (position == null) {
        _log('no location fix — using ${_fallback.countryCode}');
        return _fallback;
      }
      _log('location: ${position.latitude}, ${position.longitude}');

      final iso = _countryOf(position);
      _log('country: ${iso ?? 'unknown'}');
      if (iso == 'IN' || iso == 'CA') {
        await _storage.setCountryCode(iso!);
        return RegionResult.forCountry(iso);
      }
      if (kDebugMode) {
        // Debug build (simulator / test phone): never block.
        _log('outside India/Canada or unknown — not blocking, using ${_fallback.countryCode}');
        return _fallback;
      }
      return const RegionResult.blocked(
        'REGION_UNAVAILABLE',
        'Ryva is currently not available in your location.',
      );
    } catch (e) {
      _log('check failed ($e) — using ${_fallback.countryCode}');
      return _fallback;
    }
  }

  Future<Position?> _quickPosition() async {
    try {
      final last = await Geolocator.getLastKnownPosition();
      if (last != null) return last;
    } catch (_) {}
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (_) {
      return null;
    }
  }

  /// Rough India / Canada boxes — a basic on-device check, no geocoder or server call.
  String? _countryOf(Position p) {
    final lat = p.latitude, lng = p.longitude;
    if (lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 97.5) return 'IN';
    if (lat >= 41.6 && lat <= 83.2 && lng >= -141 && lng <= -52.6) return 'CA';
    return null;
  }
}
