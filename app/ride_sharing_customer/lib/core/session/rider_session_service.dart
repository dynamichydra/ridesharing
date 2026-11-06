import 'dart:convert';
import 'dart:developer' as developer;
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/constants.dart';
import '../network/dio_client.dart';
import '../services/storage_service.dart';

/// A rider account's money rules, fixed by its registered country — mirrors the backend's
/// rider-payment-profile.js. There is no other currency/gateway logic in the app.
class RiderPaymentProfile {
  final String countryCode;
  final String currencyCode;
  final String currencySymbol;
  final String gateway; // 'razorpay' | 'stripe'

  const RiderPaymentProfile._(this.countryCode, this.currencyCode, this.currencySymbol, this.gateway);

  static const india = RiderPaymentProfile._('IN', 'INR', '₹', 'razorpay');
  static const canada = RiderPaymentProfile._('CA', 'CAD', 'CA\$', 'stripe');

  static RiderPaymentProfile forCountry(String? isoCode) =>
      (isoCode ?? '').toUpperCase() == 'CA' ? canada : india;

  String get gatewayName => gateway == 'stripe' ? 'Stripe' : 'Razorpay';
}

/// The rider's identity as the app keeps it locally: name, email, country, currency, payment
/// gateway and saved cards. Always a copy of the server's — written at login and replaced on
/// every verification.
class RiderSession {
  final String name;
  final String email;
  final String? phone;
  final String? countryCode; // 'IN' | 'CA'
  final String? countryName;
  final String? currencyCode; // 'INR' | 'CAD'
  final String? currencySymbol;
  final String? paymentGateway; // 'razorpay' | 'stripe'
  final List<Map<String, dynamic>> savedPaymentMethods;

  const RiderSession({
    required this.name,
    required this.email,
    this.phone,
    this.countryCode,
    this.countryName,
    this.currencyCode,
    this.currencySymbol,
    this.paymentGateway,
    this.savedPaymentMethods = const [],
  });

  RiderPaymentProfile get paymentProfile => RiderPaymentProfile.forCountry(countryCode);

  factory RiderSession.fromJson(Map<String, dynamic> json) => RiderSession(
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        phone: json['phone']?.toString(),
        countryCode: json['countryCode']?.toString().toUpperCase(),
        countryName: json['countryName']?.toString(),
        currencyCode: json['currencyCode']?.toString().toUpperCase(),
        currencySymbol: json['currencySymbol']?.toString(),
        paymentGateway: json['paymentGateway']?.toString().toLowerCase(),
        savedPaymentMethods: (json['savedPaymentMethods'] as List? ?? const [])
            .whereType<Map>()
            .map((m) => Map<String, dynamic>.from(m))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'phone': phone,
        'countryCode': countryCode,
        'countryName': countryName,
        'currencyCode': currencyCode,
        'currencySymbol': currencySymbol,
        'paymentGateway': paymentGateway,
        'savedPaymentMethods': savedPaymentMethods,
      };

  RiderSession copyWith({String? name, String? email, List<Map<String, dynamic>>? savedPaymentMethods}) => RiderSession(
        name: name ?? this.name,
        email: email ?? this.email,
        phone: phone,
        countryCode: countryCode,
        countryName: countryName,
        currencyCode: currencyCode,
        currencySymbol: currencySymbol,
        paymentGateway: paymentGateway,
        savedPaymentMethods: savedPaymentMethods ?? this.savedPaymentMethods,
      );

  /// Fields that must match what the server says the account is (logged when they drift).
  bool sameAccountRulesAs(RiderSession other) =>
      countryCode == other.countryCode &&
      currencyCode == other.currencyCode &&
      paymentGateway == other.paymentGateway;
}

enum SessionCheckStatus { verified, loggedOut, blocked, unverified }

class SessionCheck {
  final SessionCheckStatus status;
  final RiderSession? session;
  final bool profileComplete;
  final String? code;
  final String? message;

  const SessionCheck(this.status, {this.session, this.profileComplete = true, this.code, this.message});
}

/// Keeps the rider's name/email/country/currency in secure storage and re-verifies them
/// against GET /riders/session on every app open. The server is the source of truth: a
/// verified response replaces the local copy, a missing/deleted account logs the rider out,
/// and a blocked or wrong-country account is refused.
class RiderSessionService {
  static const String _key = 'rider_session';

  final DioClient _dioClient;
  final StorageService _storage;
  final FlutterSecureStorage _secure;

  RiderSessionService(this._dioClient, this._storage, this._secure);

  RiderSession? _cached;

  /// The account's payment profile for synchronous UI use. Before login (no session yet) it
  /// follows the verified location — the country the rider can register in.
  RiderPaymentProfile get paymentProfile =>
      _cached?.paymentProfile ?? RiderPaymentProfile.forCountry(_storage.getCountryCode());

  RiderSession? get cached => _cached;

  /// Loads the stored session into memory at start-up (before any screen reads it).
  Future<void> load() async {
    _cached = await current();
    AppConstants.currencySymbol = paymentProfile.currencySymbol;
  }

  Future<RiderSession?> current() async {
    try {
      final raw = await _secure.read(key: _key);
      if (raw == null || raw.isEmpty) return null;
      return RiderSession.fromJson(Map<String, dynamic>.from(jsonDecode(raw) as Map));
    } catch (_) {
      return null;
    }
  }

  Future<void> save(RiderSession session) async {
    await _secure.write(key: _key, value: jsonEncode(session.toJson()));
    _cached = session;
    // Plain key-value copies for quick reads anywhere in the app.
    if (session.countryCode != null) await _storage.setCountryCode(session.countryCode!);
    await _storage.setCurrencyCode(session.paymentProfile.currencyCode);
    AppConstants.currencySymbol = session.paymentProfile.currencySymbol;
  }

  Future<void> clear() async {
    _cached = null;
    try {
      await _secure.delete(key: _key);
    } catch (_) {}
  }

  /// After cards are added/removed, so the stored copy matches until the next verification.
  Future<void> updateSavedPaymentMethods(List<Map<String, dynamic>> methods) async {
    final s = _cached ?? await current();
    if (s != null) await save(s.copyWith(savedPaymentMethods: methods));
  }

  /// At login: store the basics from the verify-OTP response, then immediately pull the full
  /// session (payment gateway + saved cards) from the API.
  Future<void> saveFromLogin(Map user, Map? country) async {
    final countryCode = (country?['isoCode'] ?? '').toString().toUpperCase().nullIfEmpty;
    final profile = RiderPaymentProfile.forCountry(countryCode);
    await save(RiderSession(
      name: user['name']?.toString() ?? '',
      email: user['email']?.toString() ?? '',
      phone: user['phone']?.toString(),
      countryCode: countryCode,
      countryName: country?['name']?.toString(),
      currencyCode: profile.currencyCode,
      currencySymbol: profile.currencySymbol,
      paymentGateway: profile.gateway,
    ));
    await verify();
  }

  /// After the rider edits name/email (signup details, edit profile).
  Future<void> updateProfile({required String name, required String email}) async {
    final s = await current();
    if (s != null) await save(s.copyWith(name: name, email: email));
  }

  Future<SessionCheck> verify() async {
    try {
      final res = await _dioClient.dio.get('/api/v1/riders/session');
      final body = res.data;
      if (body is! Map || body['SUCCESS'] != true || body['MESSAGE'] is! Map) {
        return const SessionCheck(SessionCheckStatus.unverified, message: 'Could not verify your account.');
      }
      final data = Map<String, dynamic>.from(body['MESSAGE'] as Map);
      final session = RiderSession.fromJson(data);
      final previous = _cached ?? await current();
      if (previous != null && !previous.sameAccountRulesAs(session)) {
        // Stored country/currency/gateway were stale or tampered with — the server's win.
        developer.log('[RiderSession] local account rules differed from server; replaced');
      }
      await save(session); // the server's values always win over whatever was stored
      return SessionCheck(
        SessionCheckStatus.verified,
        session: session,
        profileComplete: data['profileComplete'] != false,
      );
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final body = e.response?.data;
      final code = body is Map ? body['CODE']?.toString() : null;
      final message = body is Map ? body['MESSAGE']?.toString() : null;
      if (status == 401 || code == 'ACCOUNT_NOT_FOUND') {
        await _storage.clearAuth();
        await clear();
        return SessionCheck(SessionCheckStatus.loggedOut, code: code, message: message);
      }
      if (status == 403 && code != null) {
        return SessionCheck(SessionCheckStatus.blocked, code: code, message: message);
      }
      return const SessionCheck(
        SessionCheckStatus.unverified,
        code: 'SESSION_UNVERIFIED',
        message: 'We could not verify your account. Check your connection and try again.',
      );
    }
  }
}

extension on String {
  String? get nullIfEmpty => isEmpty ? null : this;
}
