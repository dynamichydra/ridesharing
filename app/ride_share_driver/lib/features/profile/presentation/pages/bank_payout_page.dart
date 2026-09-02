import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../injection_container.dart' as di;
import '../../../wallet/presentation/bloc/wallet_bloc.dart';
import '../../../../common/widgets/custom_toast.dart';

class BankPayoutPage extends StatefulWidget {
  const BankPayoutPage({super.key});

  @override
  State<BankPayoutPage> createState() => _BankPayoutPageState();
}

class _BankPayoutPageState extends State<BankPayoutPage> {
  late final WalletBloc _walletBloc;

  @override
  void initState() {
    super.initState();
    _walletBloc = di.sl<WalletBloc>()..add(LoadWalletData());
  }

  void _showAddEditBankModal(BuildContext context, BankDetails? bankDetails) {
    final formKey = GlobalKey<FormState>();
    final holderCtrl = TextEditingController(text: bankDetails?.accountHolderName ?? '');
    final bankNameCtrl = TextEditingController(text: bankDetails?.bankName ?? '');
    final accountCtrl = TextEditingController(); // Don't prefill masked last4 to ensure clean entry
    final routingCtrl = TextEditingController(text: bankDetails?.routingCode ?? '');
    final upiCtrl = TextEditingController(text: bankDetails?.upiId ?? '');

    bool isUpiMode = bankDetails?.upiId != null && (bankDetails?.accountNumberLast4 == null || bankDetails!.accountNumberLast4!.isEmpty);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            padding: EdgeInsets.only(
              top: 20,
              left: 24,
              right: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          bankDetails != null ? 'Edit Bank & Payout Details' : 'Add Bank Account',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your payout details are securely encrypted and used for earnings transfer.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16),

                    // Toggle between Bank Account and UPI
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setModalState(() => isUpiMode = false),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: !isUpiMode ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: !isUpiMode
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  'Bank Account',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: !isUpiMode ? const Color(0xFF009048) : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setModalState(() => isUpiMode = true),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: isUpiMode ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: isUpiMode
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  'UPI ID (VPA)',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: isUpiMode ? const Color(0xFF009048) : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (!isUpiMode) ...[
                      // Account Holder Name
                      const Text('Account Holder Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: holderCtrl,
                        decoration: _buildInputDecoration(hint: 'e.g. Rahul Sharma', icon: Icons.person_outline_rounded),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Account holder name is required' : null,
                      ),
                      const SizedBox(height: 14),

                      // Bank Name
                      const Text('Bank Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: bankNameCtrl,
                        decoration: _buildInputDecoration(hint: 'e.g. State Bank of India / HDFC Bank', icon: Icons.account_balance_outlined),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Bank name is required' : null,
                      ),
                      const SizedBox(height: 14),

                      // Account Number
                      const Text('Account Number', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: accountCtrl,
                        keyboardType: TextInputType.number,
                        decoration: _buildInputDecoration(
                          hint: bankDetails?.accountNumberLast4 != null
                              ? 'Enter account number (Ends in ${bankDetails!.accountNumberLast4})'
                              : 'Enter full account number',
                          icon: Icons.credit_card_outlined,
                        ),
                        validator: (v) {
                          if ((v == null || v.trim().isEmpty) && bankDetails?.accountNumberLast4 == null) {
                            return 'Account number is required';
                          }
                          if (v != null && v.isNotEmpty && (v.length < 9 || v.length > 18)) {
                            return 'Must be between 9 and 18 digits';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // Routing Code / IFSC
                      const Text('IFSC / Routing Code', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: routingCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: _buildInputDecoration(hint: 'e.g. SBIN0001234', icon: Icons.numbers_rounded),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Routing/IFSC code is required';
                          }
                          return null;
                        },
                      ),
                    ] else ...[
                      // UPI ID
                      const Text('UPI ID (Virtual Payment Address)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: upiCtrl,
                        keyboardType: TextInputType.emailAddress,
                        decoration: _buildInputDecoration(hint: 'e.g. driver@oksbi / mobilenumber@upi', icon: Icons.qr_code_rounded),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'UPI ID is required';
                          if (!v.contains('@')) return 'Please enter a valid UPI ID (e.g. name@bank)';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // Account Holder Name (Optional for UPI)
                      const Text('Account Holder Name (Optional)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: holderCtrl,
                        decoration: _buildInputDecoration(hint: 'e.g. Rahul Sharma', icon: Icons.person_outline_rounded),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        onPressed: () {
                          if (formKey.currentState!.validate()) {
                            final holder = holderCtrl.text.trim();
                            final bank = bankNameCtrl.text.trim();
                            final acc = accountCtrl.text.trim();
                            final routing = routingCtrl.text.trim();
                            final upi = upiCtrl.text.trim();

                            Navigator.pop(ctx);

                            if (isUpiMode) {
                              _walletBloc.add(SubmitBankDetails(
                                upiId: upi,
                                accountHolderName: holder.isNotEmpty ? holder : null,
                              ));
                            } else {
                              _walletBloc.add(SubmitBankDetails(
                                accountHolderName: holder.isNotEmpty ? holder : null,
                                bankName: bank.isNotEmpty ? bank : null,
                                accountNumber: acc.isNotEmpty ? acc : null,
                                routingCode: routing.isNotEmpty ? routing.toUpperCase() : null,
                              ));
                            }
                          }
                        },
                        child: const Text(
                          'Save & Submit for Verification',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  InputDecoration _buildInputDecoration({required String hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
      prefixIcon: Icon(icon, size: 20, color: const Color(0xFF64748B)),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF009048), width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _walletBloc,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: const Text(
            'Bank & Payout Account',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 17,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Color(0xFF009048), size: 22),
              onPressed: () => _walletBloc.add(LoadWalletData()),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: BlocConsumer<WalletBloc, WalletState>(
          listener: (context, state) {
            if (state is WalletSubmitSuccess) {
              CustomToast.show(context, 'Bank details submitted successfully!');
            } else if (state is WalletActionSuccess) {
              CustomToast.show(context, state.message);
            } else if (state is WalletError) {
              CustomToast.show(context, state.message);
            }
          },
          builder: (context, state) {
            if (state is WalletLoading) {
              return const Center(
                child: CircularProgressIndicator(color: Color(0xFF009048)),
              );
            }

            BankDetails? bankDetails;
            PayoutAccount? payoutAccount;

            if (state is WalletLoaded) {
              bankDetails = state.bankDetails;
              payoutAccount = state.payoutAccount;
            } else if (state is WalletSubmitting) {
              bankDetails = state.bankDetails;
              payoutAccount = state.payoutAccount;
            }

            final hasBank = bankDetails != null &&
                ((bankDetails.accountNumberLast4 != null && bankDetails.accountNumberLast4!.isNotEmpty) ||
                 (bankDetails.upiId != null && bankDetails.upiId!.isNotEmpty));

            final isApproved = payoutAccount?.status == 'approved' || bankDetails?.isVerified == true;
            final isRejected = payoutAccount?.status == 'rejected';

            return RefreshIndicator(
              onRefresh: () async => _walletBloc.add(LoadWalletData()),
              color: const Color(0xFF009048),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status Badge Banner
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isApproved
                            ? const Color(0xFFE6F4EA)
                            : isRejected
                                ? const Color(0xFFFEE2E2)
                                : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isApproved
                              ? const Color(0xFF009048).withValues(alpha: 0.3)
                              : isRejected
                                  ? const Color(0xFFDC2626).withValues(alpha: 0.3)
                                  : const Color(0xFFD97706).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isApproved
                                ? Icons.verified_rounded
                                : isRejected
                                    ? Icons.error_rounded
                                    : Icons.hourglass_top_rounded,
                            color: isApproved
                                ? const Color(0xFF009048)
                                : isRejected
                                    ? const Color(0xFFDC2626)
                                    : const Color(0xFFD97706),
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isApproved
                                      ? 'Payout Account Approved'
                                      : isRejected
                                          ? 'Payout Verification Failed'
                                          : hasBank
                                              ? 'Verification In Progress'
                                              : 'Bank Account Required',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: isApproved
                                        ? const Color(0xFF009048)
                                        : isRejected
                                            ? const Color(0xFFDC2626)
                                            : const Color(0xFFB45309),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  isApproved
                                      ? 'Your account is verified. You can receive ride earnings and cash out.'
                                      : isRejected
                                          ? (payoutAccount?.rejectionReason ?? 'Details could not be verified. Please re-check and update.')
                                          : hasBank
                                              ? 'Your details are under penny drop verification or admin review.'
                                              : 'Add your active bank account or UPI ID to enable driver go-live and payouts.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isApproved
                                        ? const Color(0xFF0F5132)
                                        : isRejected
                                            ? const Color(0xFF842029)
                                            : const Color(0xFF664D03),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Main Bank Details Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE6F4EA),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.account_balance_rounded, color: Color(0xFF009048), size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  const Text(
                                    'Linked Bank Details',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                              if (hasBank)
                                TextButton.icon(
                                  icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFF009048)),
                                  label: const Text('Edit', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF009048))),
                                  onPressed: () => _showAddEditBankModal(context, bankDetails),
                                ),
                            ],
                          ),
                          const Divider(height: 28, color: Color(0xFFF1F5F9)),

                          if (!hasBank) ...[
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 24),
                                child: Column(
                                  children: [
                                    Container(
                                      width: 56,
                                      height: 56,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFF1F5F9),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.add_card_rounded, color: Color(0xFF94A3B8), size: 28),
                                    ),
                                    const SizedBox(height: 12),
                                    const Text(
                                      'No Bank Account Configured',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                    ),
                                    const SizedBox(height: 6),
                                    const Text(
                                      'Add your bank details or UPI ID to receive automatic weekly payouts.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                    ),
                                    const SizedBox(height: 18),
                                    SizedBox(
                                      height: 44,
                                      child: ElevatedButton.icon(
                                        icon: const Icon(Icons.add_rounded, size: 18),
                                        label: const Text('Add Bank Account', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF009048),
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          elevation: 0,
                                        ),
                                        onPressed: () => _showAddEditBankModal(context, null),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ] else ...[
                            if (bankDetails.accountHolderName != null && bankDetails.accountHolderName!.isNotEmpty) ...[
                              _buildInfoRow('Account Holder', bankDetails.accountHolderName!),
                              const SizedBox(height: 12),
                            ],
                            if (bankDetails.bankName != null && bankDetails.bankName!.isNotEmpty) ...[
                              _buildInfoRow('Bank Name', bankDetails.bankName!),
                              const SizedBox(height: 12),
                            ],
                            if (bankDetails.accountNumberLast4 != null && bankDetails.accountNumberLast4!.isNotEmpty) ...[
                              _buildInfoRow('Account Number', '•••• •••• ${bankDetails.accountNumberLast4}'),
                              const SizedBox(height: 12),
                            ],
                            if (bankDetails.routingCode != null && bankDetails.routingCode!.isNotEmpty) ...[
                              _buildInfoRow('IFSC / Routing Code', bankDetails.routingCode!),
                              const SizedBox(height: 12),
                            ],
                            if (bankDetails.upiId != null && bankDetails.upiId!.isNotEmpty) ...[
                              _buildInfoRow('UPI ID', bankDetails.upiId!),
                              const SizedBox(height: 12),
                            ],
                            _buildInfoRow(
                              'Verification Status',
                              isApproved ? 'Approved & Active' : (isRejected ? 'Rejected' : 'Pending Review'),
                              valueColor: isApproved
                                  ? const Color(0xFF009048)
                                  : (isRejected ? const Color(0xFFDC2626) : const Color(0xFFD97706)),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Informational Guide Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF021B47)),
                              SizedBox(width: 8),
                              Text(
                                'Payout Guidelines',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          _buildGuidelineItem('1. Bank accounts must be in the driver’s registered legal name.'),
                          _buildGuidelineItem('2. Instant cash out transfers to this bank account within 24 hours.'),
                          _buildGuidelineItem('3. Updating your bank account will trigger a security re-verification.'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: valueColor ?? const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildGuidelineItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
      ),
    );
  }
}
