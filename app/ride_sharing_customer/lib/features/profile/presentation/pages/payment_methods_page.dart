import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/services/stripe_checkout_launcher.dart';
import '../../../../core/services/razorpay_checkout_launcher.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../injection_container.dart';
import '../../../location/services/location_service.dart';
import '../bloc/profile_bloc.dart';

class PaymentMethodsPage extends StatefulWidget {
  const PaymentMethodsPage({super.key});

  @override
  State<PaymentMethodsPage> createState() => _PaymentMethodsPageState();
}

class _PaymentMethodsPageState extends State<PaymentMethodsPage> {
  String _selectedMethodId = 'cash';
  bool _isLoading = false;

  void _showAddPaymentMethodSheet() {
    final profileState = context.read<ProfileBloc>().state;
    String country = '';
    String phone = '';
    if (profileState is ProfileLoaded) {
      country = (profileState.userProfile['countryCode'] ??
              profileState.userProfile['country'] ??
              '')
          .toString()
          .toLowerCase();
      phone = (profileState.userProfile['phone'] ?? '').toString();
    }

    final bool isLikelyDomestic = country == 'in' || country == 'india' || phone.startsWith('+91');

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const Text(
                  'Add Payment Card',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0A2540),
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Select the region where you plan to use this card. Cards travel with your account.',
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 20),

                // International Card (Stripe)
                InkWell(
                  onTap: () {
                    Navigator.pop(ctx);
                    _startCardSetup(gateway: 'stripe');
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: !isLikelyDomestic ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                        width: !isLikelyDomestic ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFF009048).withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.public_rounded, color: Color(0xFF009048), size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text(
                                    'International Card',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0A2540),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF635BFF).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'STRIPE',
                                      style: TextStyle(
                                        color: Color(0xFF635BFF),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'For Canada, US, Europe, UK & international travels. Supports Visa, Mastercard, Amex.',
                                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Domestic India Card (Razorpay)
                InkWell(
                  onTap: () {
                    Navigator.pop(ctx);
                    _startCardSetup(gateway: 'razorpay');
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isLikelyDomestic ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                        width: isLikelyDomestic ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.credit_card_rounded, color: Color(0xFF0284C7), size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text(
                                    'India Domestic Card',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0A2540),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'RAZORPAY',
                                      style: TextStyle(
                                        color: Color(0xFF0284C7),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'For rides within India. Supports domestic cards & tokenization (INR).',
                                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _startCardSetup({required String gateway}) async {
    final profileState = context.read<ProfileBloc>().state;
    setState(() => _isLoading = true);
    try {
      final dioClient = sl<DioClient>();
      final loc = await LocationService().getCurrentLocation();

      String currencyCode = gateway == 'stripe' ? 'CAD' : 'INR';
      String countryCode = gateway == 'stripe' ? 'CA' : 'IN';
      if (profileState is ProfileLoaded && gateway == 'stripe') {
        final country = (profileState.userProfile['countryCode'] ??
                profileState.userProfile['country'] ??
                '')
            .toString()
            .toLowerCase();
        if (country == 'us' || country == 'united states') {
          currencyCode = 'USD';
          countryCode = 'US';
        } else if (country == 'gb' || country == 'uk' || country == 'united kingdom') {
          currencyCode = 'GBP';
          countryCode = 'GB';
        }
      }

      final Map<String, dynamic> payload = {
        'gatewayName': gateway,
        'currencyCode': currencyCode,
        'countryCode': countryCode,
      };
      if (loc != null) {
        payload['pickupLat'] = loc.latitude;
        payload['pickupLng'] = loc.longitude;
      }

      final res = await dioClient.dio.post(
        '/api/v1/payment-methods/setup',
        data: payload,
      );

      if (res.data['SUCCESS'] == true) {
        final data = res.data['MESSAGE'];
        final resolvedGateway = (data['gateway'] ?? gateway).toString().toLowerCase();

        if (resolvedGateway == 'stripe') {
          final launcher = StripeCheckoutLauncher();
          final clientSecret = data['clientSecret']?.toString() ?? '';
          final publishableKey = data['publishableKey']?.toString() ?? '';

          if (clientSecret.isEmpty || publishableKey.isEmpty) {
            throw Exception('Stripe setup credentials missing from server response');
          }

          final result = await launcher.setupPaymentSheet(
            setupIntentClientSecret: clientSecret,
            publishableKey: publishableKey,
          );

          if (result.success) {
            final setupIntentId = data['setupIntentId']?.toString() ??
                clientSecret.split('_secret_').first;

            final attachRes = await dioClient.dio.post(
              '/api/v1/payment-methods/attach',
              data: {
                'gateway': 'stripe',
                'setupIntentId': setupIntentId,
                'gatewayCustomerId': data['gatewayCustomerId'],
                'isDefault': true,
                'merchantAccountId': data['merchantAccountId'],
              },
            );

            if (attachRes.data['SUCCESS'] == true) {
              if (mounted) {
                CustomToast.show(context, 'International card added successfully');
                context.read<ProfileBloc>().add(LoadProfile());
              }
            } else {
              if (mounted) {
                CustomToast.show(
                  context,
                  attachRes.data['MESSAGE']?.toString() ?? 'Failed to attach card to account',
                );
              }
            }
          } else if (result.isCancelled) {
            if (mounted) CustomToast.show(context, 'Card setup cancelled');
          } else {
            if (mounted) {
              CustomToast.show(
                context,
                result.errorMessage ?? 'Payment setup failed',
              );
            }
          }
        } else if (resolvedGateway == 'razorpay') {
          final launcher = RazorpayCheckoutLauncher();
          final result = await launcher.setupCard(
            keyId: data['keyId'],
            customerId: data['gatewayCustomerId'],
            gatewayOrderId: data['gatewayOrderId'],
            currencyCode: 'INR',
          );

          if (result.success) {
            final attachRes = await dioClient.dio.post(
              '/api/v1/payment-methods/attach',
              data: {
                'gateway': 'razorpay',
                'gatewayCustomerId': data['gatewayCustomerId'],
                'paymentMethodToken': result.paymentId,
                'last4': '1111',
                'cardBrand': 'Card',
                'expiryMonth': '10',
                'expiryYear': '2027',
                'isDefault': true,
                'merchantAccountId': data['merchantAccountId'],
              },
            );

            if (attachRes.data['SUCCESS'] == true) {
              if (mounted) {
                CustomToast.show(context, 'India payment card added successfully');
                context.read<ProfileBloc>().add(LoadProfile());
              }
            } else {
              if (mounted) {
                CustomToast.show(
                  context,
                  attachRes.data['MESSAGE']?.toString() ?? 'Failed to attach card to account',
                );
              }
            }
          } else {
            if (mounted) {
              CustomToast.show(context, 'Payment setup cancelled: ${result.errorMessage}');
            }
          }
        } else {
          if (mounted) {
            CustomToast.show(context, 'Gateway ${data['gateway']} is not yet supported.');
          }
        }
      } else {
        if (mounted) {
          CustomToast.show(context, 'Failed to initialize setup: ${res.data['MESSAGE']}');
        }
      }
    } catch (e) {
      if (mounted) CustomToast.show(context, 'Failed to initialize card setup: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _setPreferredPaymentMethod(String id) async {
    setState(() => _isLoading = true);
    try {
      final dioClient = sl<DioClient>();
      final res = await dioClient.dio.patch('/api/v1/payment-methods/$id/preferred');
      if (res.data['SUCCESS'] == true || res.data['success'] == true) {
        if (mounted) {
          CustomToast.show(context, 'Preferred payment method updated');
          setState(() => _selectedMethodId = id);
          context.read<ProfileBloc>().add(LoadProfile());
        }
      } else {
        if (mounted) CustomToast.show(context, res.data['MESSAGE'] ?? 'Failed to update preferred method');
      }
    } catch (e) {
      if (mounted) CustomToast.show(context, 'Failed to set preferred method: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deletePaymentMethod(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Remove Card'),
        content: const Text(
          'Are you sure you want to remove this payment method? It will be removed from your saved cards across all regions.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final dioClient = sl<DioClient>();
      final res = await dioClient.dio.delete('/api/v1/payment-methods/$id');
      if (res.data['SUCCESS'] == true || res.data['success'] == true) {
        if (mounted) {
          CustomToast.show(context, 'Payment method removed');
          if (_selectedMethodId == id) {
            setState(() => _selectedMethodId = 'cash');
          }
          context.read<ProfileBloc>().add(LoadProfile());
        }
      } else {
        if (mounted) CustomToast.show(context, 'Failed to remove payment method');
      }
    } catch (e) {
      if (mounted) CustomToast.show(context, 'Error removing payment method: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Payment Methods',
          style: TextStyle(
            color: Color(0xFF0A2540),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0A2540)),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading || _isLoading) {
            return const LoadingView();
          }

          List<dynamic> paymentMethods = [];
          if (state is ProfileLoaded) {
            paymentMethods = state.userProfile['payment_methods'] ?? [];
          }

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Roaming info banner
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.public_rounded, color: Color(0xFF16A34A), size: 20),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Your saved cards travel with you! Cards valid in your current region are ready for checkout.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF166534),
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    _buildPaymentMethodItem(
                      id: 'cash',
                      imageAsset: 'assets/icons/money-in.png',
                      title: 'Cash',
                      subtitle: 'Pay with cash after ride',
                      isDefault: false,
                      isEligible: true,
                      ineligibilityReason: null,
                      onSetPreferred: null,
                    ),

                    ...paymentMethods.map((pm) {
                      final brand = (pm['cardBrand']?.toString() ?? pm['brand']?.toString() ?? 'Card').toUpperCase();
                      final last4 = pm['last4']?.toString() ?? '****';
                      final expMonth = pm['expiryMonth']?.toString() ?? pm['expMonth']?.toString() ?? '';
                      final expYear = pm['expiryYear']?.toString() ?? pm['expYear']?.toString() ?? '';
                      final gateway = pm['gateway']?.toString().toUpperCase() ?? '';

                      String subtitle = (expMonth.isNotEmpty && expYear.isNotEmpty)
                          ? 'Expires $expMonth/$expYear • $gateway'
                          : gateway;

                      final isEligible = pm['isEligible'] != false;
                      final ineligibilityReason = pm['ineligibilityReason']?.toString();
                      final isDefault = pm['isDefault'] == true;
                      final methodId = pm['id']?.toString() ?? '';

                      return _buildPaymentMethodItem(
                        id: methodId,
                        imageAsset: 'assets/icons/cab-payment.png',
                        title: '$brand •••• $last4',
                        subtitle: subtitle,
                        isDefault: isDefault,
                        isEligible: isEligible,
                        ineligibilityReason: ineligibilityReason,
                        onSetPreferred: isDefault ? null : () => _setPreferredPaymentMethod(methodId),
                      );
                    }),
                  ],
                ),
              ),

              // Add Payment Method Button
              Padding(
                padding: const EdgeInsets.only(left: 16, right: 16, bottom: 24),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: _showAddPaymentMethodSheet,
                    icon: const Icon(
                      Icons.add_circle_outline_rounded,
                      color: Color(0xFF009048),
                    ),
                    label: const Text(
                      'Add Credit/Debit Card',
                      style: TextStyle(
                        color: Color(0xFF0A2540),
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPaymentMethodItem({
    required String id,
    required String imageAsset,
    required String title,
    required String subtitle,
    required bool isDefault,
    required bool isEligible,
    required String? ineligibilityReason,
    required VoidCallback? onSetPreferred,
  }) {
    final isSelected = _selectedMethodId == id || isDefault;
    final isCard = id != 'cash';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isEligible ? Colors.white : const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDefault
              ? const Color(0xFF009048)
              : (isSelected ? const Color(0xFF009048).withValues(alpha: 0.5) : const Color(0xFFF1F5F9)),
          width: isDefault ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isEligible ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                child: Image.asset(
                  imageAsset,
                  width: 24,
                  height: 24,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.payment_rounded, color: Color(0xFF009048)),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: isEligible ? const Color(0xFF0A2540) : const Color(0xFF64748B),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isDefault)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF009048).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'Preferred',
                              style: TextStyle(
                                color: Color(0xFF009048),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              if (isCard)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isDefault && onSetPreferred != null)
                      TextButton(
                        onPressed: onSetPreferred,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: const Size(0, 32),
                        ),
                        child: const Text(
                          'Set Preferred',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF009048)),
                        ),
                      ),
                    IconButton(
                      icon: const Icon(
                        Icons.delete_outline,
                        color: Colors.redAccent,
                        size: 20,
                      ),
                      onPressed: () => _deletePaymentMethod(id),
                    ),
                  ],
                )
              else
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? const Color(0xFF009048) : const Color(0xFFCBD5E1),
                      width: isSelected ? 6 : 2,
                    ),
                  ),
                ),
            ],
          ),

          // Regional availability explanation
          if (!isEligible && ineligibilityReason != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFFD97706)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      ineligibilityReason,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF92400E),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
