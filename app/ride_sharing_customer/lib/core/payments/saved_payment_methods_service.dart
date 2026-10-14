import 'package:dio/dio.dart';
import '../services/razorpay_checkout_launcher.dart';
import '../services/stripe_checkout_launcher.dart';

/// A tokenized card saved via `/payment-methods` — mirrored in the rider and driver apps
/// (keep both copies in sync). Only the gateway token's id lives on our backend; card data
/// never touches the app.
class SavedPaymentMethod {
  final String id;
  final String gateway; // stripe | razorpay
  final String cardBrand;
  final String last4;
  final String? expiryMonth;
  final String? expiryYear;
  final bool isDefault;
  final bool isEligible;
  final String? ineligibilityReason;

  const SavedPaymentMethod({
    required this.id,
    required this.gateway,
    required this.cardBrand,
    required this.last4,
    this.expiryMonth,
    this.expiryYear,
    this.isDefault = false,
    this.isEligible = true,
    this.ineligibilityReason,
  });

  factory SavedPaymentMethod.fromJson(Map<String, dynamic> json) => SavedPaymentMethod(
        id: json['id'].toString(),
        gateway: (json['gateway'] ?? '').toString().toLowerCase(),
        cardBrand: (json['cardBrand'] ?? 'Card').toString(),
        last4: (json['last4'] ?? '••••').toString(),
        expiryMonth: json['expiryMonth']?.toString(),
        expiryYear: json['expiryYear']?.toString(),
        isDefault: json['isDefault'] == true || json['isPreferred'] == true,
        isEligible: json['isEligible'] != false,
        ineligibilityReason: json['ineligibilityReason']?.toString(),
      );

  String get title => '${cardBrand.toUpperCase()} •••• $last4';

  String get subtitle {
    final expiry = (expiryMonth != null && expiryYear != null) ? 'Expires $expiryMonth/$expiryYear • ' : '';
    return '$expiry${gateway.toUpperCase()}';
  }
}

class PaymentFlowException implements Exception {
  final String message;
  final bool cancelled;
  const PaymentFlowException(this.message, {this.cancelled = false});
  @override
  String toString() => message;
}

/// What `/verify` needs after the payer finished a gateway step on the device.
class GatewayCompletion {
  final String orderRef;
  final String paymentRef;
  final String? signature;
  const GatewayCompletion({required this.orderRef, required this.paymentRef, this.signature});
}

/// Saved cards for the signed-in rider/driver: list, tokenize/attach, set preferred, remove, and
/// finish whatever a payment-initiate endpoint hands back (new checkout or saved-card action).
///
/// [pathPrefix] is '/api/v1' here because the rider DioClient's base URL is the bare origin.
class SavedPaymentMethodsService {
  final Dio dio;
  final String pathPrefix;

  SavedPaymentMethodsService({required this.dio, this.pathPrefix = ''});

  String get _base => '$pathPrefix/payment-methods';

  Map<String, dynamic> _unwrap(Response res) {
    final data = res.data;
    if (data is Map && data['SUCCESS'] == true) {
      final msg = data['MESSAGE'];
      return msg is Map ? Map<String, dynamic>.from(msg) : {'value': msg};
    }
    throw PaymentFlowException((data is Map ? data['MESSAGE']?.toString() : null) ?? 'Request failed');
  }

  String _dioMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['MESSAGE'] != null) return data['MESSAGE'].toString();
    return e.message ?? 'Network error';
  }

  /// Pass [currencyCode]/[countryId] to have the backend flag cards that can't be used for
  /// that transaction (wrong region/gateway); without them only expired cards are flagged.
  Future<List<SavedPaymentMethod>> list({String? currencyCode, String? countryId}) async {
    try {
      final res = await dio.get(_base, queryParameters: {
        if (currencyCode != null && currencyCode.isNotEmpty) 'currencyCode': currencyCode,
        if (countryId != null && countryId.isNotEmpty) 'countryId': countryId,
      });
      final data = res.data;
      final raw = (data is Map && data['SUCCESS'] == true) ? data['MESSAGE'] : null;
      if (raw is! List) return [];
      return raw.whereType<Map>().map((m) => SavedPaymentMethod.fromJson(Map<String, dynamic>.from(m))).toList();
    } on DioException catch (e) {
      throw PaymentFlowException(_dioMessage(e));
    }
  }

  /// Full tokenization: setup intent → gateway sheet on device → attach. Returns the saved
  /// card. [gateway] null lets the backend pick the gateway for [countryId]/[currencyCode].
  Future<SavedPaymentMethod> addCard({
    String? gateway,
    String? countryId,
    String? currencyCode,
    bool makeDefault = false,
  }) async {
    try {
      final setup = _unwrap(await dio.post('$_base/setup', data: {
        if (gateway != null) 'gatewayName': gateway,
        if (countryId != null && countryId.isNotEmpty) 'countryId': countryId,
        if (currencyCode != null && currencyCode.isNotEmpty) 'currencyCode': currencyCode,
      }));

      final resolvedGateway = (setup['gateway'] ?? gateway ?? '').toString().toLowerCase();
      final Map<String, dynamic> attachBody;

      if (resolvedGateway == 'stripe') {
        final clientSecret = setup['clientSecret']?.toString() ?? '';
        final publishableKey = setup['publishableKey']?.toString() ?? '';
        if (clientSecret.isEmpty || publishableKey.isEmpty) {
          throw const PaymentFlowException('Stripe setup credentials missing from server response');
        }
        final result = await StripeCheckoutLauncher().setupPaymentSheet(
          setupIntentClientSecret: clientSecret,
          publishableKey: publishableKey,
        );
        if (!result.success) {
          throw PaymentFlowException(result.errorMessage ?? 'Card setup failed', cancelled: result.isCancelled);
        }
        attachBody = {
          'gateway': 'stripe',
          'setupIntentId': setup['setupIntentId'] ?? clientSecret.split('_secret_').first,
          'gatewayCustomerId': setup['gatewayCustomerId'],
        };
      } else if (resolvedGateway == 'razorpay') {
        final result = await RazorpayCheckoutLauncher().setupCard(
          keyId: setup['keyId'].toString(),
          customerId: setup['gatewayCustomerId'].toString(),
          gatewayOrderId: setup['gatewayOrderId'].toString(),
          amountMinor: (setup['amountMinor'] as num?)?.toInt() ?? 100,
          currencyCode: setup['currencyCode']?.toString() ?? 'INR',
          prefill: setup['prefill'] is Map ? Map<String, dynamic>.from(setup['prefill']) : null,
        );
        if (!result.success) {
          throw PaymentFlowException(result.errorMessage ?? 'Card setup cancelled', cancelled: true);
        }
        attachBody = {
          'gateway': 'razorpay',
          'gatewayCustomerId': setup['gatewayCustomerId'],
          'razorpayPaymentId': result.paymentId,
          'razorpayOrderId': result.orderId,
          'razorpaySignature': result.signature,
        };
      } else {
        throw PaymentFlowException('Card saving is not supported for ${resolvedGateway.isEmpty ? 'this region' : resolvedGateway}');
      }

      final saved = _unwrap(await dio.post('$_base/attach', data: {
        ...attachBody,
        'isDefault': makeDefault,
        'merchantAccountId': setup['merchantAccountId'],
      }));
      return SavedPaymentMethod.fromJson(saved);
    } on DioException catch (e) {
      throw PaymentFlowException(_dioMessage(e));
    }
  }

  Future<void> setPreferred(String id) async {
    try {
      _unwrap(await dio.patch('$_base/$id/preferred'));
    } on DioException catch (e) {
      throw PaymentFlowException(_dioMessage(e));
    }
  }

  Future<void> remove(String id) async {
    try {
      final res = await dio.delete('$_base/$id');
      if (res.data is! Map || res.data['SUCCESS'] != true) {
        throw PaymentFlowException(res.data is Map ? res.data['MESSAGE']?.toString() ?? 'Failed to remove card' : 'Failed to remove card');
      }
    } on DioException catch (e) {
      throw PaymentFlowException(_dioMessage(e));
    }
  }

  /// Runs the on-device step for an initiate response that wasn't settled server-side:
  /// - saved Stripe card needing 3DS (`requiresAction`) → authentication only
  /// - Stripe new payment → PaymentSheet
  /// - Razorpay (saved card or new) → Checkout, opened for the saved customer when present
  /// Throws [PaymentFlowException] (cancelled: true) if the payer backs out.
  Future<GatewayCompletion> completeGatewayStep(
    Map<String, dynamic> data, {
    required String description,
    String? fallbackCurrency,
  }) async {
    final gateway = data['gateway']?.toString().toLowerCase() ?? '';
    final orderRef = data['gatewayOrderId']?.toString() ?? '';
    if (orderRef.isEmpty) throw const PaymentFlowException('Payment order missing from server response');

    if (gateway == 'stripe') {
      final clientSecret = data['clientSecret']?.toString() ?? '';
      final publishableKey = data['publishableKey']?.toString() ?? '';
      final launcher = StripeCheckoutLauncher();
      final ok = data['requiresAction'] == true
          ? await launcher.handleNextAction(clientSecret: clientSecret, publishableKey: publishableKey)
          : await launcher.checkout(clientSecret: clientSecret, publishableKey: publishableKey);
      if (!ok) throw const PaymentFlowException('Payment was not completed', cancelled: true);
      return GatewayCompletion(orderRef: orderRef, paymentRef: orderRef);
    }

    if (gateway == 'razorpay') {
      final amountMinor = (data['amountMinor'] as num?)?.toInt() ??
          (((data['amount'] as num?)?.toDouble() ?? 0) * 100).round();
      final result = await RazorpayCheckoutLauncher().checkout(
        keyId: data['keyId']?.toString() ?? '',
        gatewayOrderId: orderRef,
        amountMinor: amountMinor,
        currencyCode: data['currency']?.toString() ?? fallbackCurrency ?? 'INR',
        description: description,
        customerId: data['gatewayCustomerId']?.toString(),
      );
      if (!result.success) {
        throw PaymentFlowException(result.errorMessage ?? 'Payment cancelled', cancelled: true);
      }
      return GatewayCompletion(orderRef: result.orderId!, paymentRef: result.paymentId!, signature: result.signature);
    }

    throw PaymentFlowException('Unsupported payment gateway: ${gateway.isEmpty ? 'none' : gateway}');
  }
}
