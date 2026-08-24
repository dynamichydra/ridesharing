import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../bloc/wallet_bloc.dart';
import '../../../../core/widgets/custom_toast.dart';

class AddFundsPage extends StatefulWidget {
  const AddFundsPage({super.key});

  @override
  State<AddFundsPage> createState() => _AddFundsPageState();
}

class _AddFundsPageState extends State<AddFundsPage> {
  final TextEditingController _amountController = TextEditingController(text: '200');
  double _selectedAmount = 200.0;
  String _selectedMethodType = 'demo';

  final List<double> _presets = [100.0, 200.0, 500.0, 1000.0, 2000.0];

  final List<Map<String, dynamic>> _paymentMethods = [
    {
      'id': 'demo',
      'title': '⚡ Demo Money (Sandbox)',
      'subtitle': 'Add simulated money instantly for testing',
      'asset': 'assets/icons/money-in.png',
      'isFeatured': true,
    },
    {
      'id': 'upi',
      'title': 'Instant UPI (GPay / PhonePe / Paytm)',
      'subtitle': 'Pay using any UPI app (GPay, PhonePe, Paytm)',
      'asset': 'assets/icons/money-in.png',
      'isFeatured': false,
    },
    {
      'id': 'card',
      'title': 'Credit / Debit Card',
      'subtitle': 'Visa, Mastercard, Rupay',
      'asset': 'assets/icons/cab-payment.png',
      'isFeatured': false,
    },
    {
      'id': 'netbanking',
      'title': 'Net Banking',
      'subtitle': 'All major Indian banks supported',
      'asset': 'assets/icons/money-in.png',
      'isFeatured': false,
    },
    {
      'id': 'wallet',
      'title': 'Other Wallets',
      'subtitle': 'Paytm, PhonePe, Amazon Pay',
      'asset': 'assets/icons/money-in.png',
      'isFeatured': false,
    },
  ];

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _amountController.text.trim();
    final RegExp amountRegex = RegExp(r'^\d+$');

    if (text.isEmpty || !amountRegex.hasMatch(text)) {
      CustomToast.show(context, 'Please enter a valid whole number amount');
      return;
    }

    final double? amount = double.tryParse(text);
    if (amount == null || amount < 10) {
      CustomToast.show(context, 'Minimum amount to add is ₹10');
      return;
    }

    context.read<WalletBloc>().add(
          AddWalletFunds(
            amount: amount,
            paymentMethodId: _selectedMethodType,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0A2540), size: 24),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Add Money',
          style: TextStyle(
            color: Color(0xFF0A2540),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: BlocConsumer<WalletBloc, WalletState>(
        listener: (context, state) {
          if (state is AddFundsSuccess) {
            CustomToast.show(context, 'Funds added successfully!');
            context.pop();
          } else if (state is WalletError) {
            CustomToast.show(context, state.message);
          }
        },
        builder: (context, walletState) {
          final isLoading = walletState is WalletLoading;

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Enter Amount Card
                  const Text(
                    'Enter Amount',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0A2540),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const Text(
                              '₹ ',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0A2540),
                              ),
                            ),
                            Expanded(
                              child: TextField(
                                controller: _amountController,
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                ],
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0A2540),
                                ),
                                decoration: const InputDecoration(
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  errorBorder: InputBorder.none,
                                  disabledBorder: InputBorder.none,
                                  contentPadding: EdgeInsets.zero,
                                  isDense: true,
                                ),
                                onChanged: (val) {
                                  setState(() {
                                    _selectedAmount = double.tryParse(val) ?? 0.0;
                                  });
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: _presets.map((preset) {
                            final isSelected = _selectedAmount == preset;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedAmount = preset;
                                    _amountController.text = preset.toStringAsFixed(0);
                                  });
                                },
                                child: Container(
                                  height: 40,
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF009048) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Center(
                                    child: Text(
                                      '₹${preset.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : const Color(0xFF0A2540),
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Select Payment Method Section
                  const Text(
                    'Select Payment Method',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0A2540),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
                    ),
                    child: Column(
                      children: _paymentMethods.map((pm) {
                        final isSelected = _selectedMethodType == pm['id'];
                        return Column(
                          children: [
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedMethodType = pm['id'] as String;
                                });
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    if (pm['iconText'] != null)
                                      Container(
                                        width: 36,
                                        height: 24,
                                        alignment: Alignment.center,
                                        child: Text(
                                          pm['iconText'] as String,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF64748B),
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                      )
                                    else
                                      Icon(
                                        (pm['iconData'] as IconData?) ?? Icons.account_balance_wallet_outlined,
                                        color: const Color(0xFF0A2540),
                                        size: 24,
                                      ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            pm['title'] as String,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF0A2540),
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            pm['subtitle'] as String,
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
                                          width: 2,
                                        ),
                                      ),
                                      child: isSelected
                                          ? Center(
                                              child: Container(
                                                width: 10,
                                                height: 10,
                                                decoration: const BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  color: Color(0xFF009048),
                                                ),
                                              ),
                                            )
                                          : null,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (pm != _paymentMethods.last)
                              const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Add Money Securely Button
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton.icon(
                      onPressed: isLoading ? null : _submit,
                      icon: const Icon(Icons.lock_outline_rounded, color: Colors.white, size: 18),
                      label: isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'Add Money Securely',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Security note footer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.check_circle_rounded, color: Color(0xFF009048), size: 14),
                      SizedBox(width: 6),
                      Text(
                        'Your payment is encrypted and secure',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
