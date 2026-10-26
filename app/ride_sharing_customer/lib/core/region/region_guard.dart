import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:geolocator/geolocator.dart';
import '../network/dio_client.dart';
import '../services/storage_service.dart';

/// Outcome of a region check. [allowed] riders get a [countryCode] ('IN' | 'CA') and its
/// [dialCode]; blocked ones get a server/device [code] and a user-facing [message].
class RegionResult {
  final bool allowed;
  final String? countryCode;
  final String? countryName;
  final String? dialCode;

  /// Service city the rider is in (null outside every configured city) — the server assigns
  /// it, with the country, as the rider's home location at signup.
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

  /// The rider is somewhere Ryva doesn't operate (vs. a fixable problem like VPN / fake GPS).
  bool get isUnsupportedRegion => code == 'REGION_UNAVAILABLE';

  /// Location permission/GPS is off — the app's permission screen handles this case.
  bool get needsLocationPermission => code == 'LOCATION_PERMISSION';

  /// The account (not the location) is the problem — e.g. registered in another country.
  bool get isAccountProblem => code == 'ACCOUNT_COUNTRY_MISMATCH' || code == 'ACCOUNT_BLOCKED';
}

/// Rider app India/Canada lock (server side: backend_v2 rider-region.service.js).
///
/// Every launch/resume the app takes a *fresh* GPS fix (never the last-known cache), flags
/// mock locations and VPNs, and asks the server to decide the country — the server
/// reverse-geocodes the fix and checks the request IP's country. An allowed check returns a
/// 30-minute region token that DioClient attaches to every request as X-Region-Token; the
/// login screen locks the dial code to the verified country.
class RegionGuard with WidgetsBindingObserver {
  final StorageService _storage;
  final Dio _dio; // separate from DioClient so its interceptors can call back into this guard

  RegionGuard(this._storage)
      : _dio = Dio(BaseOptions(
          baseUrl: DioClient.baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
        )) {
    WidgetsBinding.instance.addObserver(this);
  }

  static const Set<String> regionErrorCodes = {
    'REGION_CHECK_REQUIRED',
    'REGION_UNAVAILABLE',
    'MOCK_LOCATION',
    'VPN_DETECTED',
    'NETWORK_LOCATION_MISMATCH',
    'PHONE_COUNTRY_MISMATCH',
    'STALE_LOCATION',
    'LOW_ACCURACY',
    'LOCATION_UNRESOLVED',
    'LOCATION_REQUIRED',
    'ACCOUNT_COUNTRY_MISMATCH',
    'ACCOUNT_BLOCKED',
  };

  RegionResult? _last;
  String? _token;
  DateTime? _tokenExpiry;
  Future<RegionResult>? _inFlight;
  DateTime? _lastCheckAt;

  /// Fires when a check fails after the app was already running (resume, API rejection) so
  /// the router can send the rider to the "not available" screen.
  final StreamController<RegionResult> _blocked = StreamController<RegionResult>.broadcast();
  Stream<RegionResult> get onBlocked => _blocked.stream;

  RegionResult? get current => _last;

  bool get _tokenFresh =>
      _token != null && _tokenExpiry != null && DateTime.now().isBefore(_tokenExpiry!.subtract(const Duration(minutes: 3)));

  /// Region token to send to the API, re-verifying when it's missing or about to expire.
  /// Null when the rider is currently blocked.
  Future<String?> validToken() async {
    if (_tokenFresh) return _token;
    // Blocked moments ago: don't take a GPS fix for every API call — the blocking screen's
    // retry (or the next resume) re-checks.
    if (_last != null && !_last!.allowed && _lastCheckAt != null &&
        DateTime.now().difference(_lastCheckAt!) < const Duration(seconds: 60)) {
      return null;
    }
    final result = await verify();
    return result.allowed ? _token : null;
  }

  /// Runs a full region check. Concurrent callers share one check.
  Future<RegionResult> verify() {
    return _inFlight ??= _runCheck().whenComplete(() => _inFlight = null);
  }

  void reportBlocked(RegionResult result) {
    // Account-level refusals (e.g. an Indian account opened in Canada) don't mean the location
    // check failed — keep the verified region so login can lock to the country the rider is in.
    if (!result.isAccountProblem) {
      _last = result;
      _token = null;
      _tokenExpiry = null;
    }
    _blocked.add(result);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Only once a check has happened (splash runs the first one after permission is granted).
    if (state == AppLifecycleState.resumed && _last != null && !_tokenFresh) {
      verify().then((r) {
        if (!r.allowed && !r.needsLocationPermission) _blocked.add(r);
      });
    }
  }

  Future<RegionResult> _runCheck() async {
    final RegionResult result;
    try {
      result = await _check();
    } catch (_) {
      return _remember(const RegionResult.blocked(
        'LOCATION_UNRESOLVED',
        'We could not verify your location. Check your connection and try again.',
      ));
    }
    return _remember(result);
  }

  RegionResult _remember(RegionResult r) {
    _last = r;
    _lastCheckAt = DateTime.now();
    if (!r.allowed) {
      _token = null;
      _tokenExpiry = null;
    }
    return r;
  }

  Future<RegionResult> _check() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return const RegionResult.blocked('LOCATION_PERMISSION', 'Turn on location services to use Ryva.');
    }
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      return const RegionResult.blocked('LOCATION_PERMISSION', 'Location permission is required to use Ryva.');
    }

    // Device signals are reported, not acted on here: the server rejects mock locations,
    // VPNs and missing/stale fixes when the lock is on, and lets them through when a dev
    // backend runs with RIDER_REGION_ENFORCEMENT=off (simulators sit outside India/Canada).
    final isVpn = await _isVpnActive();
    final position = await _freshPosition();
    final fixAgeMs = position == null ? null : DateTime.now().difference(position.timestamp).inMilliseconds.abs();

    try {
      final res = await _dio.post('/api/v1/auth/rider/region-check', data: {
        if (position != null) ...{
          'lat': position.latitude,
          'lng': position.longitude,
          'accuracyM': position.accuracy,
          'fixAgeMs': fixAgeMs,
          'isMocked': position.isMocked,
        },
        'isVpn': isVpn,
        'platform': Platform.operatingSystem,
      });
      final body = res.data;
      if (body is! Map || body['SUCCESS'] != true || body['MESSAGE'] is! Map) {
        return const RegionResult.blocked('LOCATION_UNRESOLVED', 'We could not verify your location. Please try again.');
      }
      final data = body['MESSAGE'] as Map;
      _token = data['regionToken']?.toString();
      final ttl = (data['expiresInSeconds'] as num?)?.toInt() ?? 1800;
      _tokenExpiry = DateTime.now().add(Duration(seconds: ttl));

      final country = data['countryCode'].toString().toUpperCase();
      await _storage.setCountryCode(country);
      return RegionResult.allowed(
        countryCode: country,
        countryName: data['countryName']?.toString() ?? (country == 'CA' ? 'Canada' : 'India'),
        dialCode: data['dialCode']?.toString() ?? (country == 'CA' ? '+1' : '+91'),
        cityName: data['cityName']?.toString(),
      );
    } on DioException catch (e) {
      final body = e.response?.data;
      if (body is Map && body['CODE'] != null) {
        return RegionResult.blocked(body['CODE'].toString(), body['MESSAGE']?.toString());
      }
      return const RegionResult.blocked(
        'LOCATION_UNRESOLVED',
        'We could not verify your location. Check your connection and try again.',
      );
    }
  }

  /// Hard GPS fetch — a live fix only. The last-known position is deliberately never used:
  /// it can be hours old or planted by a spoofing app.
  Future<Position?> _freshPosition() async {
    final isAndroid = Platform.isAndroid;
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
        forceAndroidLocationManager: isAndroid,
      );
    } catch (_) {
      try {
        return await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 10),
        );
      } catch (_) {
        return null;
      }
    }
  }

  /// Android reports VPN as a connectivity type; also look for tunnel interfaces. On iOS
  /// system tunnels (utun*) always exist, so only the server's IP-vs-GPS check applies there.
  Future<bool> _isVpnActive() async {
    try {
      final result = await Connectivity().checkConnectivity();
      if (result == ConnectivityResult.vpn) return true;
    } catch (_) {}
    if (!Platform.isAndroid) return false;
    try {
      final interfaces = await NetworkInterface.list(includeLoopback: false);
      return interfaces.any((i) {
        final name = i.name.toLowerCase();
        return name.startsWith('tun') || name.startsWith('ppp') || name.startsWith('pptp') || name.startsWith('wg');
      });
    } catch (_) {
      return false;
    }
  }
}
