import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../core/payments/saved_payment_methods_service.dart';
import '../../../../injection_container.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

/// Saved cards the driver can pay subscriptions, wallet top-ups and dues with. Same
/// tokenization flow as the rider app: card data goes straight to Stripe/Razorpay, and only
/// the gateway token's id is stored by our backend.
class PaymentMethodsPage extends StatefulWidget {
  const PaymentMethodsPage({super.key});

  @override
  State<PaymentMethodsPage> createState() => _PaymentMethodsPageState();
}

class _PaymentMethodsPageState extends State<PaymentMethodsPage> {
  final _service = sl<SavedPaymentMethodsService>();
  List<SavedPaymentMethod> _methods = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final methods = await _service.list();
      if (mounted) setState(() => _methods = methods);
    } catch (e) {
      if (mounted) CustomToast.show(context, 'Failed to load payment methods: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Indian drivers default to Razorpay (domestic cards, INR); everyone else to Stripe.
  bool get _isLikelyDomestic {
    final authState = context.read<AuthBloc>().state;
    if (authState is! Authenticated) return false;
    final phone = authState.driver.phone ?? '';
    return phone.startsWith('+91');
  }

  void _showAddPaymentMethodSheet() {
    final domestic = _isLikelyDomestic;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
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
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const Text('Add Payment Card',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0A2540))),
              const SizedBox(height: 6),
              const Text(
                'Choose where this card will be used. Saved cards can pay for subscriptions, wallet top-ups and dues.',
                style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 20),
              _gatewayOption(
                ctx,
                gateway: 'razorpay',
                title: 'India Domestic Card',
                badge: 'RAZORPAY',
                badgeColor: const Color(0xFF0284C7),
                icon: Icons.credit_card_rounded,
                description: 'For payments in India (INR). Verified with a ₹1 charge that is refunded.',
                highlighted: domestic,
              ),
              const SizedBox(height: 12),
              _gatewayOption(
                ctx,
                gateway: 'stripe',
                title: 'International Card',
                badge: 'STRIPE',
                badgeColor: const Color(0xFF635BFF),
                icon: Icons.public_rounded,
                description: 'For Canada, US, Europe, UK & other regions. Visa, Mastercard, Amex.',
                highlighted: !domestic,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _gatewayOption(
    BuildContext ctx, {
    required String gateway,
    required String title,
    required String badge,
    required Color badgeColor,
    required IconData icon,
    required String description,
    required bool highlighted,
  }) {
    return InkWell(
      onTap: () {
        Navigator.pop(ctx);
        _addCard(gateway);
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: highlighted ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
            width: highlighted ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: badgeColor.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(icon, color: badgeColor, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0A2540))),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: badgeColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(badge, style: TextStyle(color: badgeColor, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(description, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  Future<void> _addCard(String gateway) async {
    setState(() => _isLoading = true);
    try {
      final saved = await _service.addCard(gateway: gateway, makeDefault: _methods.isEmpty);
      if (mounted) CustomToast.show(context, '${saved.title} added');
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.cancelled ? 'Card setup cancelled' : e.message);
    }
    await _load();
  }

  Future<void> _setPreferred(SavedPaymentMethod pm) async {
    setState(() => _isLoading = true);
    try {
      await _service.setPreferred(pm.id);
      if (mounted) CustomToast.show(context, '${pm.title} is now your preferred card');
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.message);
    }
    await _load();
  }

  Future<void> _remove(SavedPaymentMethod pm) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Remove Card'),
        content: Text('Remove ${pm.title} from your saved payment methods?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
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
      await _service.remove(pm.id);
      if (mounted) CustomToast.show(context, 'Payment method removed');
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.message);
    }
    await _load();
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
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF009048)))
          : Column(
              children: [
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
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
                              Icon(Icons.lock_outline_rounded, color: Color(0xFF16A34A), size: 20),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Cards are tokenized by the payment gateway — we never store your card number. '
                                  'Use them for subscriptions, wallet top-ups and dues.',
                                  style: TextStyle(fontSize: 12, color: Color(0xFF166534), height: 1.3),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_methods.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: Column(
                              children: [
                                Icon(Icons.credit_card_off_rounded, size: 48, color: Color(0xFFCBD5E1)),
                                SizedBox(height: 12),
                                Text('No saved cards yet', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        for (final pm in _methods) _buildPaymentMethodItem(pm),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 16, right: 16, bottom: 24),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: _showAddPaymentMethodSheet,
                      icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF009048)),
                      label: const Text(
                        'Add Credit/Debit Card',
                        style: TextStyle(color: Color(0xFF0A2540), fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildPaymentMethodItem(SavedPaymentMethod pm) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: pm.isEligible ? Colors.white : const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: pm.isDefault ? const Color(0xFF009048) : const Color(0xFFF1F5F9),
          width: pm.isDefault ? 1.5 : 1,
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
                decoration: const BoxDecoration(color: Color(0xFFF8FAFC), shape: BoxShape.circle),
                child: const Icon(Icons.credit_card_rounded, color: Color(0xFF009048)),
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
                            pm.title,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: pm.isEligible ? const Color(0xFF0A2540) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                        if (pm.isDefault)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF009048).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('Preferred',
                                style: TextStyle(color: Color(0xFF009048), fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(pm.subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
              if (!pm.isDefault && pm.isEligible)
                TextButton(
                  onPressed: () => _setPreferred(pm),
                  style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: const Size(0, 32)),
                  child: const Text('Set Preferred',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF009048))),
                ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                onPressed: () => _remove(pm),
              ),
            ],
          ),
          if (!pm.isEligible && pm.ineligibilityReason != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFFD97706)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(pm.ineligibilityReason!,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF92400E), fontWeight: FontWeight.w500)),
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
