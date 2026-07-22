import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
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
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
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
                      icon: Icons.payments_outlined,
                      title: 'Cash',
                      subtitle: 'Pay with cash',
                      iconColor: const Color(0xFF01A34D),
                    ),
                    _buildPaymentMethodItem(
                      id: 'upi',
                      icon: Icons.qr_code_scanner_rounded,
                      title: 'UPI',
                      subtitle: 'Pay using any UPI app',
                      iconColor: const Color(0xFF0165B7),
                    ),
                    _buildPaymentMethodItem(
                      id: 'cards',
                      icon: Icons.credit_card_rounded,
                      title: 'Cards',
                      subtitle: 'Visa, MasterCard, RuPay',
                      iconColor: Colors.deepPurple,
                    ),
                    _buildPaymentMethodItem(
                      id: 'wallet',
                      icon: Icons.account_balance_wallet_outlined,
                      title: 'Wallet',
                      subtitle: 'Ryva Wallet',
                      iconColor: const Color(0xFF01A34D),
                    ),
                    _buildPaymentMethodItem(
                      id: 'netbanking',
                      icon: Icons.account_balance_rounded,
                      title: 'Net Banking',
                      subtitle: 'All major banks',
                      iconColor: Colors.amber.shade800,
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
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Add payment method flow triggered')),
                      );
                    },
                    icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF01A34D)),
                    label: const Text(
                      'Add Payment Method',
                      style: TextStyle(
                        color: Color(0xFF021B47),
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFE2E7E9)),
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
    required IconData icon,
    required String title,
    required String subtitle,
    required Color iconColor,
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
            color: isSelected ? const Color(0xFF01A34D) : const Color(0xFFE2E7E9),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 22),
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
                      color: Color(0xFF021B47),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF8A94A6),
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
                  color: isSelected ? const Color(0xFF01A34D) : Colors.grey.shade300,
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
