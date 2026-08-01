import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../style/appcolors.dart';
import '../../../../injection_container.dart' as di;
import '../../../../common/widgets/custom_toast.dart';
import '../bloc/wallet_bloc.dart';

class WalletPage extends StatefulWidget {
  const WalletPage({super.key});

  @override
  State<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends State<WalletPage> {
  late final WalletBloc _bloc = di.sl<WalletBloc>();

  // Form controllers
  final _upiCtrl = TextEditingController();
  final _accNumCtrl = TextEditingController();
  final _routingCtrl = TextEditingController();
  final _bankNameCtrl = TextEditingController();
  final _holderNameCtrl = TextEditingController();
  String _selectedMethod = 'upi'; // 'upi' | 'bank'
  bool _showForm = false;

  @override
  void dispose() {
    _upiCtrl.dispose();
    _accNumCtrl.dispose();
    _routingCtrl.dispose();
    _bankNameCtrl.dispose();
    _holderNameCtrl.dispose();
    _bloc.close();
    super.dispose();
  }

  void _submitBankDetails() {
    if (_selectedMethod == 'upi') {
      if (_upiCtrl.text.trim().isEmpty) {
        CustomToast.show(context, 'Enter a valid UPI ID');
        return;
      }
      _bloc.add(SubmitBankDetails(upiId: _upiCtrl.text.trim()));
    } else {
      if (_accNumCtrl.text.trim().isEmpty || _routingCtrl.text.trim().isEmpty) {
        CustomToast.show(context, 'Account number and IFSC code are required');
        return;
      }
      _bloc.add(SubmitBankDetails(
        accountNumber: _accNumCtrl.text.trim(),
        routingCode: _routingCtrl.text.trim(),
        bankName: _bankNameCtrl.text.trim(),
        accountHolderName: _holderNameCtrl.text.trim(),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc..add(LoadWalletData()),
      child: BlocConsumer<WalletBloc, WalletState>(
        listener: (context, state) {
          if (state is WalletSubmitSuccess) {
            setState(() => _showForm = false);
            CustomToast.show(context, 'Bank details submitted! Awaiting admin approval.');
            _bloc.add(LoadWalletData());
          }
          if (state is WalletError) {
            CustomToast.show(context, state.message);
          }
        },
        builder: (context, state) {
          return Scaffold(
            backgroundColor: const Color(0xFFF8FAFC),
            appBar: AppBar(
              title: const Text('Wallet & Earnings', style: TextStyle(fontWeight: FontWeight.bold)),
              backgroundColor: Colors.white,
              foregroundColor: AppColors.textPrimary,
              elevation: 0,
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(color: AppColors.border.withOpacity(0.4), height: 1),
              ),
            ),
            body: () {
              if (state is WalletLoading || state is WalletInitial) {
                return const Center(child: CircularProgressIndicator());
              }
              if (state is WalletError) {
                return Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                    const SizedBox(height: 12),
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: () => _bloc.add(LoadWalletData()), child: const Text('Retry')),
                  ]),
                );
              }

              BankDetails? bank;
              PayoutAccount? payout;
              WalletInfo? wallet;
              bool isBusy = false;

              if (state is WalletLoaded) { bank = state.bankDetails; payout = state.payoutAccount; wallet = state.walletInfo; }
              else if (state is WalletSubmitting) { bank = state.bankDetails; payout = state.payoutAccount; isBusy = true; }
              else if (state is WalletSubmitSuccess) { bank = state.bankDetails; }

              return SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Wallet balance card
                    _buildBalanceCard(wallet),
                    const SizedBox(height: 16),

                    // Payout account status card
                    _buildPayoutStatusCard(payout),
                    const SizedBox(height: 16),

                    // Bank details card
                    _buildBankDetailsCard(bank),
                    const SizedBox(height: 16),

                    // Add/Update bank details form
                    if (_showForm) ...[
                      _buildBankForm(isBusy),
                      const SizedBox(height: 16),
                    ],

                    if (!_showForm)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => setState(() => _showForm = true),
                          icon: const Icon(Icons.add_card_rounded),
                          label: Text(bank == null ? 'Add Bank / UPI Details' : 'Update Bank / UPI Details'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                        ),
                      ),

                    const SizedBox(height: 16),
                    // Explanation card
                    _buildInfoCard(),
                  ],
                ),
              );
            }(),
          );
        },
      ),
    );
  }

  Widget _buildBalanceCard(WalletInfo? wallet) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.secondary, AppColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.25), blurRadius: 16, offset: const Offset(0, 8))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Available Balance', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        Text(
          wallet != null ? '${wallet.currencyCode} ${wallet.balanceAmount.toStringAsFixed(2)}' : '—',
          style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        const Text('Wallet Balance', style: TextStyle(color: Colors.white60, fontSize: 11)),
      ]),
    );
  }

  Widget _buildPayoutStatusCard(PayoutAccount? payout) {
    if (payout == null) {
      return _infoTile(
        icon: Icons.account_balance_outlined,
        iconColor: AppColors.textSecondary,
        title: 'No Payout Account',
        subtitle: 'Submit your bank details below to create one',
        bgColor: const Color(0xFFF1F5F9),
      );
    }

    final statusData = switch (payout.status) {
      'approved' => (color: const Color(0xFF059669), bg: const Color(0xFFECFDF5), label: '✓ Approved', subtitle: 'You can go online and accept rides'),
      'rejected' => (color: const Color(0xFFDC2626), bg: const Color(0xFFFEF2F2), label: '✗ Rejected', subtitle: payout.rejectionReason ?? 'Please resubmit your bank details'),
      _ => (color: const Color(0xFFD97706), bg: const Color(0xFFFFFBEB), label: '⏳ Pending Review', subtitle: 'An admin will review your bank details shortly'),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: statusData.bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusData.color.withOpacity(0.3)),
      ),
      child: Row(children: [
        Icon(Icons.account_balance_rounded, color: statusData.color, size: 28),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(statusData.label, style: TextStyle(color: statusData.color, fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 2),
            Text(statusData.subtitle, style: TextStyle(color: statusData.color.withOpacity(0.8), fontSize: 12)),
          ]),
        ),
      ]),
    );
  }

  Widget _buildBankDetailsCard(BankDetails? bank) {
    if (bank == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Saved Payment Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
        const SizedBox(height: 12),
        if (bank.upiId != null) ...[
          _detailRow(Icons.qr_code_rounded, 'UPI ID', bank.upiId!),
          const SizedBox(height: 8),
        ],
        if (bank.accountNumberLast4 != null) ...[
          _detailRow(Icons.credit_card_rounded, 'Account', '•••• •••• ${bank.accountNumberLast4}'),
          const SizedBox(height: 8),
          if (bank.bankName != null) _detailRow(Icons.account_balance_rounded, 'Bank', bank.bankName!),
          const SizedBox(height: 8),
          if (bank.routingCode != null) _detailRow(Icons.numbers_rounded, 'IFSC', bank.routingCode!),
        ],
      ]),
    );
  }

  Widget _buildBankForm(bool isBusy) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Payment Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 16),

        // Method toggle
        Row(children: [
          _methodToggle('upi', 'UPI ID'),
          const SizedBox(width: 10),
          _methodToggle('bank', 'Bank Account'),
        ]),
        const SizedBox(height: 16),

        if (_selectedMethod == 'upi') ...[
          _formField('UPI ID (e.g. name@upi)', _upiCtrl, Icons.qr_code_rounded),
        ] else ...[
          _formField('Account Holder Name', _holderNameCtrl, Icons.person_outline_rounded),
          const SizedBox(height: 12),
          _formField('Account Number', _accNumCtrl, Icons.credit_card_rounded, obscure: true),
          const SizedBox(height: 12),
          _formField('IFSC / Routing Code', _routingCtrl, Icons.numbers_rounded),
          const SizedBox(height: 12),
          _formField('Bank Name (optional)', _bankNameCtrl, Icons.account_balance_outlined),
        ],
        const SizedBox(height: 20),

        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => setState(() => _showForm = false),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Cancel'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: isBusy ? null : _submitBankDetails,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: isBusy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Submit', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.info_outline_rounded, color: Color(0xFF2563EB), size: 18),
          SizedBox(width: 8),
          Text('How Bank Verification Works', style: TextStyle(color: Color(0xFF1D4ED8), fontWeight: FontWeight.bold, fontSize: 13)),
        ]),
        const SizedBox(height: 8),
        const Text(
          '1. Submit your UPI ID or bank account details below.\n'
          '2. Our team reviews and approves your payout details (usually within 24 hours).\n'
          '3. Once approved, you can go online and start accepting rides.',
          style: TextStyle(color: Color(0xFF1E40AF), fontSize: 12, height: 1.6),
        ),
      ]),
    );
  }

  Widget _infoTile({required IconData icon, required Color iconColor, required String title, required String subtitle, required Color bgColor}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Icon(icon, color: iconColor, size: 26),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ])),
      ]),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Row(children: [
      Icon(icon, color: AppColors.textSecondary, size: 18),
      const SizedBox(width: 10),
      Text('$label: ', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
      Flexible(child: Text(value, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13))),
    ]);
  }

  Widget _methodToggle(String method, String label) {
    final selected = _selectedMethod == method;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedMethod = method),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? AppColors.primary : AppColors.border.withOpacity(0.5)),
          ),
          child: Center(
            child: Text(label, style: TextStyle(
              color: selected ? Colors.white : AppColors.textSecondary,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            )),
          ),
        ),
      ),
    );
  }

  Widget _formField(String hint, TextEditingController ctrl, IconData icon, {bool obscure = false}) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, color: AppColors.textSecondary, size: 20),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.border.withOpacity(0.6))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.border.withOpacity(0.6))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
      ),
    );
  }
}
