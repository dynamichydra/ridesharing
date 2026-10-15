import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/services/razorpay_checkout_launcher.dart';
import '../../../../core/services/stripe_checkout_launcher.dart';
import '../../../../core/payments/saved_payment_methods_service.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/wallet_bloc.dart';
import '../../domain/repositories/wallet_repository.dart';
import '../../../../core/widgets/custom_toast.dart';

class AddFundsPage extends StatefulWidget {
  const AddFundsPage({super.key});

  @override
  State<AddFundsPage> createState() => _AddFundsPageState();
}

class _AddFundsPageState extends State<AddFundsPage> {
  late final TextEditingController _amountController;
  late double _selectedAmount;
  // 'gateway' (fresh checkout) or a saved card id.
  String _selectedMethodType = 'gateway';
  List<SavedPaymentMethod> _savedCards = [];
  bool _addingCard = false;

  // Wallet top-up coupon preview from the server ({code, bonusMinor, creditMinor, ...}).
  Map<String, dynamic>? _appliedCoupon;
  String? _couponError;
  Timer? _couponRecheck;
  String _countryCode = 'IN'; // Resolved from wallet API or cached profile

  /// Maps ISO 4217 currency code → display symbol.
  static String _currencySymbolFor(String code) {
    switch (code.toUpperCase()) {
      case 'CAD':
      case 'USD':
        return '\$';
      case 'GBP':
        return '£';
      case 'EUR':
        return '€';
      case 'AED':
        return 'د.إ';
      case 'INR':
      default:
        return '₹';
    }
  }

  List<double> get _presets {
    switch (_countryCode) {
      case 'CA':
      case 'US':
        return [10.0, 20.0, 50.0, 100.0, 200.0];
      case 'GB':
        return [10.0, 20.0, 50.0, 100.0, 200.0];
      default: // IN and others
        return [100.0, 200.0, 500.0, 1000.0, 2000.0];
    }
  }

  String get _currencySymbol => _currencySymbolFor(_currencyCode);
  String get _currencyCode {
    switch (_countryCode) {
      case 'CA': return 'CAD';
      case 'US': return 'USD';
      case 'GB': return 'GBP';
      default:   return 'INR';
    }
  }

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(text: '200');
    _selectedAmount = 200.0;
    _resolveUserCountry();
    _loadSavedCards();
  }

  // Only cards usable for this wallet's currency/region are offered; the preferred one is
  // preselected.
  Future<void> _loadSavedCards({String? selectId}) async {
    try {
      final cards = await di.sl<SavedPaymentMethodsService>().list(currencyCode: _currencyCode);
      if (!mounted) return;
      final usable = cards.where((c) => c.isEligible).toList();
      setState(() {
        _savedCards = usable;
        if (selectId != null && usable.any((c) => c.id == selectId)) {
          _selectedMethodType = selectId;
        } else if (_selectedMethodType == 'gateway' || !usable.any((c) => c.id == _selectedMethodType)) {
          final preferred = usable.where((c) => c.isDefault).firstOrNull ?? usable.firstOrNull;
          _selectedMethodType = preferred?.id ?? 'gateway';
        }
      });
    } catch (_) {
      // Saved cards are optional here — the gateway checkout still works without them.
    }
  }

  Future<void> _addCard() async {
    setState(() => _addingCard = true);
    try {
      final saved = await di.sl<SavedPaymentMethodsService>().addCard(currencyCode: _currencyCode);
      if (!mounted) return;
      CustomToast.show(context, '${saved.title} saved');
      await _loadSavedCards(selectId: saved.id);
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.cancelled ? 'Card setup cancelled' : e.message);
    } finally {
      if (mounted) setState(() => _addingCard = false);
    }
  }

  void _resolveUserCountry() {
    try {
      final storage = di.sl<StorageService>();

      // 1. First check cached wallet data (authoritative from server /api/v1/wallets/me)
      final cachedWallet = storage.getCachedData('cached_wallet_data');
      if (cachedWallet is Map && cachedWallet['currency'] != null) {
        _applyCountryFromCurrency(cachedWallet['currency'].toString());
        return;
      }

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
        _countryCode = storedCountry.isNotEmpty ? storedCountry : 'IN';
      }
    } catch (_) {}

    _applyDefaultAmount();
  }

  void _applyCountryFromCurrency(String currencyCode) {
    switch (currencyCode.toUpperCase()) {
      case 'CAD':
        _countryCode = 'CA';
        break;
      case 'USD':
        _countryCode = 'US';
        break;
      case 'GBP':
        _countryCode = 'GB';
        break;
      case 'INR':
      default:
        _countryCode = 'IN';
    }
    _applyDefaultAmount();
  }

  void _applyDefaultAmount() {
    if (_countryCode == 'IN') {
      _selectedAmount = 200.0;
      _amountController.text = '200';
    } else {
      _selectedAmount = 50.0;
      _amountController.text = '50';
    }
  }


  List<Map<String, dynamic>> get _paymentMethods => [
        for (final card in _savedCards)
          {
            'id': card.id,
            'title': card.title,
            'subtitle': card.subtitle,
            'iconData': Icons.credit_card_rounded,
            'badge': card.isDefault ? 'PREFERRED' : 'SAVED',
          },
        ..._gatewayMethods,
      ];

  List<Map<String, dynamic>> get _gatewayMethods {
    switch (_countryCode) {
      case 'CA':
      case 'US':
      case 'GB':
      case 'AU':
        return [
          {
            'id': 'gateway',
            'gateway': 'stripe',
            'title': 'Credit / Debit Card',
            'subtitle': 'Visa, Mastercard, American Express, Apple Pay',
            'iconData': Icons.credit_card_rounded,
          },
        ];
      default: // India
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
    _couponRecheck?.cancel();
    _amountController.dispose();
    super.dispose();
  }

  // ── Coupons ──────────────────────────────────────────────────────────────────

  String _money(num minor) => '$_currencySymbol${(minor / 100).toStringAsFixed(minor % 100 == 0 ? 0 : 2)}';

  /// Validates [code] for the current amount; returns an error message or null on success.
  Future<String?> _applyCoupon(String code) async {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount <= 0) return 'Enter an amount first';
    try {
      final preview = await di.sl<WalletRepository>().previewTopupCoupon(amount, code.trim().toUpperCase());
      if (!mounted) return null;
      setState(() {
        _appliedCoupon = preview;
        _couponError = null;
      });
      return null;
    } catch (e) {
      return e.toString();
    }
  }

  void _removeCoupon() {
    _couponRecheck?.cancel();
    setState(() {
      _appliedCoupon = null;
      _couponError = null;
    });
  }

  // The bonus depends on the amount (percentage, minimum top-up), so re-check after edits.
  void _scheduleCouponRecheck() {
    final code = _appliedCoupon?['code']?.toString();
    if (code == null) return;
    _couponRecheck?.cancel();
    _couponRecheck = Timer(const Duration(milliseconds: 500), () async {
      final error = await _applyCoupon(code);
      if (error != null && mounted) {
        setState(() {
          _appliedCoupon = null;
          _couponError = '$code removed: $error';
        });
      }
    });
  }

  Future<void> _openCouponSheet() async {
    final codeController = TextEditingController();
    String? sheetError;
    bool applying = false;
    final couponsFuture = di.sl<WalletRepository>().getTopupCoupons();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          Future<void> apply(String code) async {
            if (code.trim().isEmpty) return;
            setSheet(() {
              applying = true;
              sheetError = null;
            });
            final error = await _applyCoupon(code);
            if (!ctx.mounted) return;
            if (error == null) {
              Navigator.pop(ctx);
            } else {
              setSheet(() {
                applying = false;
                sheetError = error;
              });
            }
          }

          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
            child: SafeArea(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.75),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(4)),
                        ),
                      ),
                      const Text('Apply Coupon',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0A2540))),
                      const SizedBox(height: 4),
                      const Text('Get bonus money credited to your wallet with this top-up.',
                          style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: codeController,
                              textCapitalization: TextCapitalization.characters,
                              style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1),
                              decoration: InputDecoration(
                                hintText: 'Enter coupon code',
                                isDense: true,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onSubmitted: apply,
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox(
                            height: 46,
                            child: ElevatedButton(
                              onPressed: applying ? null : () => apply(codeController.text),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF009048),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: applying
                                  ? const SizedBox(
                                      width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Apply', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                      if (sheetError != null) ...[
                        const SizedBox(height: 8),
                        Text(sheetError!, style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626))),
                      ],
                      const SizedBox(height: 18),
                      const Text('AVAILABLE COUPONS',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                      const SizedBox(height: 8),
                      Flexible(
                        child: FutureBuilder<List<Map<String, dynamic>>>(
                          future: couponsFuture,
                          builder: (ctx, snap) {
                            if (snap.connectionState != ConnectionState.done) {
                              return const Padding(
                                padding: EdgeInsets.all(20),
                                child: Center(child: CircularProgressIndicator(color: Color(0xFF009048))),
                              );
                            }
                            final coupons = snap.data ?? [];
                            if (coupons.isEmpty) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 16),
                                child: Text('No wallet coupons available right now',
                                    style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                              );
                            }
                            return ListView.separated(
                              shrinkWrap: true,
                              itemCount: coupons.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (ctx, i) => _buildCouponTile(
                                coupons[i],
                                onApply: applying ? null : () => apply(coupons[i]['code'].toString()),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCouponTile(Map<String, dynamic> coupon, {VoidCallback? onApply}) {
    final canApply = coupon['canApply'] != false;
    final isPercent = coupon['discountType'] == 'percentage';
    final value = (coupon['discountValue'] as num?) ?? 0;
    final cap = coupon['maxDiscountMinor'] as num?;
    final minMinor = (coupon['minFareMinor'] as num?) ?? 0;
    final headline = isPercent
        ? '$value% extra${cap != null ? ' (up to ${_money(cap)})' : ''}'
        : '${_money(value)} extra';

    return Opacity(
      opacity: canApply ? 1 : 0.5,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            const Icon(Icons.local_offer_rounded, color: Color(0xFF009048), size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(coupon['code']?.toString() ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1, color: Color(0xFF0A2540))),
                  const SizedBox(height: 2),
                  Text(headline, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF009048))),
                  if ((coupon['description']?.toString() ?? '').isNotEmpty)
                    Text(coupon['description'].toString(), style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  if (minMinor > 0)
                    Text('Min. top-up ${_money(minMinor)}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                ],
              ),
            ),
            canApply
                ? TextButton(
                    onPressed: onApply,
                    child: const Text('APPLY', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF009048))),
                  )
                : Text(coupon['statusLabel']?.toString() ?? 'Unavailable',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
    );
  }

  Widget _buildCouponCard() {
    final coupon = _appliedCoupon;
    if (coupon == null) {
      return InkWell(
        onTap: _openCouponSheet,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.local_offer_outlined, color: Color(0xFF009048), size: 22),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text('Apply Coupon',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0A2540))),
                  ),
                  Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                ],
              ),
              if (_couponError != null) ...[
                const SizedBox(height: 6),
                Text(_couponError!, style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626))),
              ],
            ],
          ),
        ),
      );
    }

    final bonus = (coupon['bonusMinor'] as num?) ?? 0;
    final credit = (coupon['creditMinor'] as num?) ?? 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBBF7D0), width: 1.2),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("'${coupon['code']}' applied",
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF166534))),
                const SizedBox(height: 2),
                Text('${_money(bonus)} bonus • ${_money(credit)} will be added to your wallet',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF15803D))),
              ],
            ),
          ),
          TextButton(
            onPressed: _removeCoupon,
            child: const Text('Remove', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Future<void> _launchRazorpay(RazorpayTopupReady state) async {
    final result = await RazorpayCheckoutLauncher().checkout(
      keyId: state.keyId,
      gatewayOrderId: state.gatewayOrderId,
      amountMinor: state.amountMinor,
      currencyCode: state.currencyCode,
      description: state.description,
      customerId: state.customerId,
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
    final launcher = StripeCheckoutLauncher();
    final success = state.requiresAction
        ? await launcher.handleNextAction(clientSecret: state.clientSecret, publishableKey: state.publishableKey)
        : await launcher.checkout(clientSecret: state.clientSecret, publishableKey: state.publishableKey);

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
          InitiateWalletTopup(
            amount: amount,
            paymentMethodId: _selectedMethodType == 'gateway' ? null : _selectedMethodType,
            promoCode: _appliedCoupon?['code']?.toString(),
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
          if (state is RazorpayTopupReady) {
            _launchRazorpay(state);
          } else if (state is StripeTopupReady) {
            _launchStripe(state);
          } else if (state is AddFundsSuccess) {
            CustomToast.show(
              context,
              _appliedCoupon != null ? 'Funds added with ${_appliedCoupon!['code']} bonus!' : 'Funds added successfully!',
            );
            context.pop();
          } else if (state is WalletError) {
            CustomToast.show(context, state.message);
          } else if (state is WalletLoaded) {
            // Update country/currency in case cache was stale at initState
            final resolvedCode = state.currency;
            final prevCountry = _countryCode;
            _applyCountryFromCurrency(resolvedCode);
            if (_countryCode != prevCountry) {
              setState(() {}); // Rebuild with correct currency/presets/gateway
              _loadSavedCards();
            }
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
                                  _scheduleCouponRecheck();
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
                                  _scheduleCouponRecheck();
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
                  const SizedBox(height: 16),

                  // Wallet top-up coupon (bonus credit)
                  _buildCouponCard(),
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
                            if (pm['id'] != _paymentMethods.last['id'])
                              const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: (isLoading || _addingCard) ? null : _addCard,
                      icon: _addingCard
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.add_card_rounded, size: 18, color: Color(0xFF0065B3)),
                      label: const Text(
                        'Save a new card',
                        style: TextStyle(color: Color(0xFF0065B3), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

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
