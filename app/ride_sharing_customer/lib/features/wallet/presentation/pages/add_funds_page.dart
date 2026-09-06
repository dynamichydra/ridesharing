import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/services/razorpay_checkout_launcher.dart';
import '../../../../core/services/stripe_checkout_launcher.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/wallet_bloc.dart';
import '../../../../core/widgets/custom_toast.dart';

class AddFundsPage extends StatefulWidget {
  const AddFundsPage({super.key});

  @override
  State<AddFundsPage> createState() => _AddFundsPageState();
}

class _AddFundsPageState extends State<AddFundsPage> {
  late final TextEditingController _amountController;
  late double _selectedAmount;
  String _selectedMethodType = 'gateway';
  String _countryCode = 'IN'; // Strict based on logged in user's profile: 'IN' or 'CA'

  List<double> get _presets => _countryCode == 'CA'
      ? [10.0, 20.0, 50.0, 100.0, 200.0]
      : [100.0, 200.0, 500.0, 1000.0, 2000.0];

  String get _currencySymbol => _countryCode == 'CA' ? '\$' : '₹';
  String get _currencyCode => _countryCode == 'CA' ? 'CAD' : 'INR';

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(text: '200');
    _selectedAmount = 200.0;
    _resolveUserCountry();
  }

  void _resolveUserCountry() {
    try {
      final storage = di.sl<StorageService>();
      
      // 1. First check cached wallet data (authoritative from server /api/v1/wallets/me)
      final cachedWallet = storage.getCachedData('cached_wallet_data');
      if (cachedWallet is Map && cachedWallet['currency'] != null) {
        final currency = cachedWallet['currency'].toString().toUpperCase();
        if (currency == 'CAD') {
          _countryCode = 'CA';
        } else if (currency == 'INR') {
          _countryCode = 'IN';
        }
      } else {
        // 2. Fallback to stored user profile phone / country code
        final cachedProfile = storage.getCachedData('cached_profile_data');
        if (cachedProfile is Map && cachedProfile['phone'] != null) {
          final phone = cachedProfile['phone'].toString();
          if (phone.startsWith('+1')) {
            _countryCode = 'CA';
          } else if (phone.startsWith('+91')) {
            _countryCode = 'IN';
          }
        } else {
          final storedCountry = storage.getCountryCode().toUpperCase();
          if (storedCountry == 'CA') {
            _countryCode = 'CA';
          } else {
            _countryCode = 'IN';
          }
        }
      }
    } catch (_) {}

    if (_countryCode == 'CA') {
      _selectedAmount = 50.0;
      _amountController.text = '50';
    }
  }

  List<Map<String, dynamic>> get _paymentMethods {
    if (_countryCode == 'CA') {
      return [
        {
          'id': 'gateway',
          'gateway': 'stripe',
          'title': 'Credit / Debit Card',
          'subtitle': 'Visa, Mastercard, American Express, Apple Pay',
          'iconData': Icons.credit_card_rounded,
        },
      ];
    } else {
      return [
        {
          'id': 'gateway',
          'gateway': 'razorpay',
          'title': 'Instant UPI / Cards / NetBanking',
          'subtitle': 'GPay, PhonePe, Paytm, Cards & NetBanking',
          'iconData': Icons.account_balance_wallet_rounded,
        },
      ];
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _launchRazorpay(RazorpayTopupReady state) async {
    final result = await RazorpayCheckoutLauncher().checkout(
      keyId: state.keyId,
      gatewayOrderId: state.gatewayOrderId,
      amountMinor: state.amountMinor,
      currencyCode: state.currencyCode,
      description: state.description,
    );

    if (!mounted) return;

    if (result.success) {
      context.read<WalletBloc>().add(VerifyWalletTopup(
            orderRef: result.orderId!,
            paymentRef: result.paymentId!,
            signature: result.signature,
          ));
    } else {
      CustomToast.show(context, result.errorMessage ?? 'Payment was cancelled or failed.');
      context.read<WalletBloc>().add(TopupCancelled());
    }
  }

  Future<void> _launchStripe(StripeTopupReady state) async {
    final success = await StripeCheckoutLauncher().checkout(
      clientSecret: state.clientSecret,
      publishableKey: state.publishableKey,
    );

    if (!mounted) return;

    if (success) {
      context.read<WalletBloc>().add(VerifyWalletTopup(
            orderRef: state.gatewayOrderId,
            paymentRef: state.gatewayOrderId,
          ));
    } else {
      CustomToast.show(context, 'Payment was cancelled or failed.');
      context.read<WalletBloc>().add(TopupCancelled());
    }
  }

  void _submit() {
    final text = _amountController.text.trim();
    final RegExp amountRegex = RegExp(r'^\d+$');

    if (text.isEmpty || !amountRegex.hasMatch(text)) {
      CustomToast.show(context, 'Please enter a valid whole number amount');
      return;
    }

    final double? amount = double.tryParse(text);
    final minAmount = _countryCode == 'CA' ? 1.0 : 10.0;
    if (amount == null || amount < minAmount) {
      CustomToast.show(context, 'Minimum amount to add is $_currencySymbol$minAmount');
      return;
    }

    context.read<WalletBloc>().add(
          InitiateWalletTopup(amount: amount),
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
          if (state is RazorpayTopupReady) {
            _launchRazorpay(state);
          } else if (state is StripeTopupReady) {
            _launchStripe(state);
          } else if (state is AddFundsSuccess) {
            CustomToast.show(context, 'Funds added successfully!');
            context.pop();
          } else if (state is WalletError) {
            CustomToast.show(context, state.message);
          }
        },
        builder: (context, walletState) {
          final isLoading = walletState is WalletLoading || walletState is TopupProcessing;

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
                            Text(
                              '$_currencySymbol ',
                              style: const TextStyle(
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
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _currencyCode,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF64748B),
                                ),
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
                                  margin: const EdgeInsets.symmetric(horizontal: 3),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF009048) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Center(
                                    child: Text(
                                      '$_currencySymbol${preset.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : const Color(0xFF0A2540),
                                        fontWeight: FontWeight.w600,
                                        fontSize: 12,
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
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF009048).withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        pm['iconData'] as IconData,
                                        color: const Color(0xFF009048),
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  pm['title'] as String,
                                                  style: const TextStyle(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.bold,
                                                    color: Color(0xFF0A2540),
                                                  ),
                                                ),
                                              ),
                                              if (pm['badge'] != null)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFF1F5F9),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: Text(
                                                    pm['badge'] as String,
                                                    style: const TextStyle(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.w600,
                                                      color: Color(0xFF475569),
                                                    ),
                                                  ),
                                                ),
                                            ],
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
                                    const SizedBox(width: 10),
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
                          : Text(
                              'Add $_currencySymbol${_amountController.text.trim()} Securely',
                              style: const TextStyle(
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
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_rounded, color: Color(0xFF009048), size: 14),
                      SizedBox(width: 6),
                      Text(
                        'End-to-end 256-bit encrypted & secure payment',
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
