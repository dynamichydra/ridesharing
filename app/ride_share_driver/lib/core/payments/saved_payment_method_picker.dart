import 'package:flutter/material.dart';
import '../../common/widgets/custom_toast.dart';
import '../../injection_container.dart';
import 'saved_payment_methods_service.dart';

/// Selection id meaning "don't use a saved card — open the gateway's own checkout"
/// (UPI / netbanking / a one-off card).
const String kPayWithOtherMethod = 'other';

/// What the payer picked: a saved card, or [kPayWithOtherMethod].
class SavedPaymentChoice {
  final SavedPaymentMethod? method;
  const SavedPaymentChoice(this.method);
  static const other = SavedPaymentChoice(null);

  String get id => method?.id ?? kPayWithOtherMethod;
  bool get isSavedCard => method != null;
  String get label => method?.title ?? 'UPI / Netbanking / New card';

  /// Value for the backend's `paymentMethodId` field (null → gateway checkout).
  String? get paymentMethodId => method?.id;
}

/// Bottom sheet listing the driver's saved cards for one payment, with eligibility for the
/// transaction's currency/country, an "other method" fallback and inline "add card" (inline
/// matters: a never-subscribed driver is router-locked to the subscription screen).
///
/// Resolves to the payer's [SavedPaymentChoice], or null if dismissed.
class SavedPaymentMethodPicker extends StatefulWidget {
  final String title;
  final String? selectedId;
  final String? currencyCode;
  final String? countryId;

  const SavedPaymentMethodPicker._({
    required this.title,
    this.selectedId,
    this.currencyCode,
    this.countryId,
  });

  static Future<SavedPaymentChoice?> show(
    BuildContext context, {
    String title = 'Select Payment Method',
    String? selectedId,
    String? currencyCode,
    String? countryId,
  }) {
    return showModalBottomSheet<SavedPaymentChoice>(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SavedPaymentMethodPicker._(
        title: title,
        selectedId: selectedId,
        currencyCode: currencyCode,
        countryId: countryId,
      ),
    );
  }

  /// The card to preselect for a payment: the preferred card if usable, else the first usable
  /// one, else [kPayWithOtherMethod].
  static Future<SavedPaymentChoice> defaultSelection({
    String? currencyCode,
    String? countryId,
  }) async {
    try {
      final methods = await sl<SavedPaymentMethodsService>().list(currencyCode: currencyCode, countryId: countryId);
      final usable = methods.where((m) => m.isEligible).toList();
      final pick = usable.where((m) => m.isDefault).firstOrNull ?? usable.firstOrNull;
      return SavedPaymentChoice(pick);
    } catch (_) {
      return SavedPaymentChoice.other;
    }
  }

  @override
  State<SavedPaymentMethodPicker> createState() => _SavedPaymentMethodPickerState();
}

class _SavedPaymentMethodPickerState extends State<SavedPaymentMethodPicker> {
  final _service = sl<SavedPaymentMethodsService>();
  List<SavedPaymentMethod> _methods = [];
  bool _loading = true;
  bool _adding = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final methods = await _service.list(currencyCode: widget.currencyCode, countryId: widget.countryId);
      if (mounted) setState(() => _methods = methods);
    } catch (e) {
      if (mounted) CustomToast.show(context, e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addCard() async {
    setState(() => _adding = true);
    try {
      final saved = await _service.addCard(countryId: widget.countryId, currencyCode: widget.currencyCode);
      if (!mounted) return;
      CustomToast.show(context, '${saved.title} saved');
      Navigator.pop(context, SavedPaymentChoice(saved));
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.cancelled ? 'Card setup cancelled' : e.message);
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(4)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(widget.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            ),
            const Divider(height: 1),
            if (_loading || _adding)
              const Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(color: Color(0xFF009048)),
              )
            else
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    if (_methods.isNotEmpty)
                      const Padding(
                        padding: EdgeInsets.fromLTRB(20, 12, 20, 4),
                        child: Text('SAVED CARDS',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                      ),
                    for (final pm in _methods) _buildCardTile(pm),
                    if (_methods.isNotEmpty) const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.account_balance_rounded, color: Color(0xFF0F172A)),
                      title: const Text('UPI / Netbanking / New card', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      subtitle: const Text('Pay once on the secure payment page', style: TextStyle(fontSize: 12)),
                      trailing: widget.selectedId == kPayWithOtherMethod
                          ? const Icon(Icons.check_circle_rounded, color: Color(0xFF009048))
                          : null,
                      onTap: () => Navigator.pop(context, SavedPaymentChoice.other),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF0065B3)),
                      title: const Text('Add new card',
                          style: TextStyle(color: Color(0xFF0065B3), fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('Saved securely with the payment gateway', style: TextStyle(fontSize: 12)),
                      onTap: _addCard,
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardTile(SavedPaymentMethod pm) {
    final selected = widget.selectedId == pm.id;
    return Opacity(
      opacity: pm.isEligible ? 1 : 0.55,
      child: ListTile(
        leading: Icon(Icons.credit_card_rounded, color: pm.isEligible ? const Color(0xFF009048) : const Color(0xFF94A3B8)),
        title: Row(
          children: [
            Flexible(child: Text(pm.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
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
        subtitle: Text(
          pm.isEligible ? pm.subtitle : (pm.ineligibilityReason ?? 'Not available for this payment'),
          style: TextStyle(fontSize: 12, color: pm.isEligible ? const Color(0xFF64748B) : const Color(0xFFB45309)),
        ),
        trailing: selected ? const Icon(Icons.check_circle_rounded, color: Color(0xFF009048)) : null,
        onTap: () {
          if (!pm.isEligible) {
            CustomToast.show(context, pm.ineligibilityReason ?? 'This card cannot be used here');
            return;
          }
          Navigator.pop(context, SavedPaymentChoice(pm));
        },
      ),
    );
  }
}
