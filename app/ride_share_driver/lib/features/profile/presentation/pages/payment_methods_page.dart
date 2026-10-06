import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../subscription/presentation/checkout/stripe_checkout_launcher.dart';
import '../../../../core/network/api_client.dart';
import '../../../../injection_container.dart';
import '../bloc/profile_bloc.dart';

class PaymentMethodsPage extends StatefulWidget {
  const PaymentMethodsPage({super.key});

  @override
  State<PaymentMethodsPage> createState() => _PaymentMethodsPageState();
}

class _PaymentMethodsPageState extends State<PaymentMethodsPage> {
  String _selectedMethodId = 'cash'; // Default selected method
  bool _isLoading = false;

  Future<void> _addPaymentMethodStripe() async {
    setState(() => _isLoading = true);
    try {
      final apiClient = sl<ApiClient>();
      final res = await apiClient.dio.post('/api/v1/payment-methods/setup');
      if (res.data['SUCCESS'] == true) {
        final data = res.data['MESSAGE'];
        if (data['gateway'] == 'stripe') {
          final launcher = StripeCheckoutLauncher();
          final success = await launcher.setupPaymentSheet(
            setupIntentClientSecret: data['clientSecret'],
            publishableKey: data['publishableKey'],
          );

          if (success) {
            CustomToast.show(context, 'Payment method added successfully');
            context.read<ProfileBloc>().add(LoadProfile()); // Refresh profile to get methods
          } else {
            CustomToast.show(context, 'Payment setup cancelled or failed');
          }
        } else {
          CustomToast.show(context, 'Gateway ${data['gateway']} setup is not yet implemented natively.');
        }
      }
    } catch (e) {
      CustomToast.show(context, 'Failed to initialize setup: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Payment Methods',
          style: TextStyle(color: Color(0xFF0A2540), fontWeight: FontWeight.bold, fontSize: 18),
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
            return const Center(child: CircularProgressIndicator(color: Color(0xFF009048)));
          }

          List<dynamic> paymentMethods = [];
          if (state is ProfileLoaded) {
            paymentMethods = state.profile.paymentMethods;
          }

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildPaymentMethodItem(
                      id: 'cash',
                      imageAsset: 'assets/icons/money-in.png',
                      title: 'Cash',
                      subtitle: 'Pay with cash after ride',
                      isDefault: false,
                    ),
                    ...paymentMethods.map((pm) {
                      final brand = pm['brand']?.toString().toUpperCase() ?? 'CARD';
                      final last4 = pm['last4'] ?? '****';
                      return _buildPaymentMethodItem(
                        id: pm['id']?.toString() ?? '',
                        imageAsset: 'assets/icons/cab-payment.png',
                        title: '$brand .... $last4',
                        subtitle: 'Expires ${pm['expMonth']}/${pm['expYear']}',
                        isDefault: pm['isDefault'] == true,
                      );
                    }).toList(),
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
                    onPressed: _addPaymentMethodStripe,
                    icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF009048)),
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
  }) {
    final isSelected = _selectedMethodId == id;

    return InkWell(
      onTap: () {
        setState(() {
          _selectedMethodId = id;
        });
      },
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF009048) : const Color(0xFFF1F5F9),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                shape: BoxShape.circle,
              ),
              child: Image.asset(
                imageAsset,
                width: 24,
                height: 24,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.payment_rounded,
                  color: Color(0xFF009048),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0A2540),
                        ),
                      ),
                      if (isDefault)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF009048).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Default',
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
      ),
    );
  }
}
