import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/profile_bloc.dart';

class PaymentMethodsPage extends StatefulWidget {
  const PaymentMethodsPage({super.key});

  @override
  State<PaymentMethodsPage> createState() => _PaymentMethodsPageState();
}

class _PaymentMethodsPageState extends State<PaymentMethodsPage> {
  String _selectedMethodId = 'cash'; // Default selected method

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
          if (state is ProfileLoading) {
            return const LoadingView();
          }

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildPaymentMethodItem(
                      id: 'cash',
                      imageAsset: 'assets/icons/cab-payment.png',
                      title: 'Cash',
                      subtitle: 'Pay with cash after ride',
                    ),
                    _buildPaymentMethodItem(
                      id: 'upi',
                      imageAsset: 'assets/icons/money-in.png',
                      title: 'UPI',
                      subtitle: 'Pay using any UPI app',
                    ),
                    _buildPaymentMethodItem(
                      id: 'cards',
                      imageAsset: 'assets/icons/cab-payment.png',
                      title: 'Cards',
                      subtitle: 'Visa, MasterCard, RuPay',
                    ),
                    _buildPaymentMethodItem(
                      id: 'wallet',
                      imageAsset: 'assets/icons/money-in.png',
                      title: 'Wallet',
                      subtitle: 'Ryva Wallet',
                    ),
                    _buildPaymentMethodItem(
                      id: 'netbanking',
                      imageAsset: 'assets/icons/cab-payment.png',
                      title: 'Net Banking',
                      subtitle: 'All major banks',
                    ),
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
                    onPressed: () {
                      CustomToast.show(context, 'Add payment method flow triggered');
                    },
                    icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF009048)),
                    label: const Text(
                      'Add Payment Method',
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
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0A2540),
                    ),
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
            // Custom Radio Circle Indicator
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
