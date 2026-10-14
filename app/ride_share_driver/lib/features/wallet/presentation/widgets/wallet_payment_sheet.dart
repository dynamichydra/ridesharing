import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../core/payments/saved_payment_method_picker.dart';
import '../../../../core/payments/saved_payment_methods_service.dart';
import '../../../../core/utils/currency_helper.dart';
import '../../../../injection_container.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../data/datasources/wallet_remote_datasource.dart';

enum WalletPaymentMode { topup, dues }

/// Add money to the driver wallet, or clear dues (negative balance from cash-ride
/// commission), paying with a saved card or the gateway's checkout. Resolves to true once the
/// wallet has been credited.
class WalletPaymentSheet extends StatefulWidget {
  final WalletPaymentMode mode;
  final String currencyCode;
  final int duesMinor;

  const WalletPaymentSheet._({required this.mode, required this.currencyCode, this.duesMinor = 0});

  static Future<bool?> show(
    BuildContext context, {
    required WalletPaymentMode mode,
    required String currencyCode,
    int duesMinor = 0,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => WalletPaymentSheet._(mode: mode, currencyCode: currencyCode, duesMinor: duesMinor),
    );
  }

  @override
  State<WalletPaymentSheet> createState() => _WalletPaymentSheetState();
}

class _WalletPaymentSheetState extends State<WalletPaymentSheet> {
  final _amountController = TextEditingController();
  SavedPaymentChoice _choice = SavedPaymentChoice.other;
  bool _busy = false;

  bool get _isDues => widget.mode == WalletPaymentMode.dues;

  String? get _countryId {
    final authState = context.read<AuthBloc>().state;
    return authState is Authenticated ? authState.driver.countryId : null;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final sel = await SavedPaymentMethodPicker.defaultSelection(
        currencyCode: widget.currencyCode,
        countryId: _countryId,
      );
      if (mounted) setState(() => _choice = sel);
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  int get _amountMinor {
    if (_isDues) return widget.duesMinor;
    final value = double.tryParse(_amountController.text.trim()) ?? 0;
    return (value * 100).round();
  }

  Future<void> _pickMethod() async {
    final picked = await SavedPaymentMethodPicker.show(
      context,
      title: _isDues ? 'Pay dues with' : 'Add money with',
      selectedId: _choice.id,
      currencyCode: widget.currencyCode,
      countryId: _countryId,
    );
    if (picked != null && mounted) setState(() => _choice = picked);
  }

  Future<void> _pay() async {
    if (_amountMinor <= 0) {
      CustomToast.show(context, 'Enter an amount to add');
      return;
    }
    setState(() => _busy = true);
    final wallet = sl<WalletRemoteDataSource>();
    try {
      final res = _isDues
          ? await wallet.payDues(paymentMethodId: _choice.paymentMethodId)
          : await wallet.initiateTopup(_amountMinor, paymentMethodId: _choice.paymentMethodId);

      // Saved card charged (or dev mode with no gateway) — already credited server-side.
      final credited = res['isPaid'] == true || res.containsKey('wallet');
      if (!credited) {
        final done = await sl<SavedPaymentMethodsService>().completeGatewayStep(
          res,
          description: _isDues ? 'Driver dues' : 'Wallet top-up',
          fallbackCurrency: widget.currencyCode,
        );
        await wallet.verifyTopup(orderRef: done.orderRef, paymentRef: done.paymentRef, signature: done.signature);
      }

      if (!mounted) return;
      CustomToast.show(context, _isDues ? 'Dues cleared — thank you!' : 'Money added to your wallet');
      Navigator.pop(context, true);
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.cancelled ? 'Payment cancelled' : e.message);
    } catch (e) {
      if (mounted) CustomToast.show(context, e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sym = CurrencyHelper.getSymbol(widget.currencyCode);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
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
              Text(
                _isDues ? 'Pay Platform Dues' : 'Add Money to Wallet',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 4),
              Text(
                _isDues
                    ? 'Commission owed from cash rides. Clearing it unfreezes your payouts.'
                    : 'Top up your wallet balance using a saved card or another method.',
                style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 20),
              if (_isDues)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Amount due', style: TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
                      const SizedBox(height: 4),
                      Text(
                        '$sym${(widget.duesMinor / 100).toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Color(0xFF991B1B)),
                      ),
                    ],
                  ),
                )
              else ...[
                TextField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    prefixText: '$sym ',
                    hintText: '0.00',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  children: [100, 500, 1000, 2000].map((v) {
                    return ActionChip(
                      label: Text('$sym$v'),
                      onPressed: () => setState(() => _amountController.text = v.toString()),
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 20),
              const Text('Payment Method', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              const SizedBox(height: 8),
              InkWell(
                onTap: _busy ? null : _pickMethod,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _choice.isSavedCard ? Icons.credit_card_rounded : Icons.account_balance_rounded,
                        color: const Color(0xFF009048),
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Text(_choice.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
                      const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _busy ? null : _pay,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isDues ? const Color(0xFFC62828) : const Color(0xFF009048),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(
                          _amountMinor > 0
                              ? '${_isDues ? 'Pay' : 'Add'} $sym${(_amountMinor / 100).toStringAsFixed(2)}'
                              : (_isDues ? 'Pay Dues' : 'Add Money'),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
