import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import 'widgets/three_dots_loader.dart';

class BankDetailsScreen extends StatefulWidget {
  final String? initialHolder;
  final String? initialBankName;
  final String? initialAccount;
  final String? initialIfsc;
  final String? initialUpiId;
  final bool isLoading;
  final VoidCallback? onSkip;
  final Function({
    String? holder,
    String? bankName,
    String? accountNumber,
    String? ifscCode,
    String? upiId,
  }) onSave;

  const BankDetailsScreen({
    super.key,
    this.initialHolder,
    this.initialBankName,
    this.initialAccount,
    this.initialIfsc,
    this.initialUpiId,
    this.isLoading = false,
    this.onSkip,
    required this.onSave,
  });

  @override
  State<BankDetailsScreen> createState() => _BankDetailsScreenState();
}

class _BankDetailsScreenState extends State<BankDetailsScreen> {
  final _bankFormKey = GlobalKey<FormState>();
  final _upiFormKey = GlobalKey<FormState>();

  late bool _isUpiMode;

  late final TextEditingController _bankNameController;
  late final TextEditingController _holderController;
  late final TextEditingController _accountController;
  late final TextEditingController _ifscController;
  late final TextEditingController _upiController;

  @override
  void initState() {
    super.initState();
    _isUpiMode = widget.initialUpiId != null &&
        widget.initialUpiId!.isNotEmpty &&
        (widget.initialAccount == null || widget.initialAccount!.isEmpty);

    _bankNameController = TextEditingController(text: widget.initialBankName);
    _holderController = TextEditingController(text: widget.initialHolder);
    _accountController = TextEditingController(text: widget.initialAccount);
    _ifscController = TextEditingController(text: widget.initialIfsc);
    _upiController = TextEditingController(text: widget.initialUpiId);
  }

  @override
  void dispose() {
    _bankNameController.dispose();
    _holderController.dispose();
    _accountController.dispose();
    _ifscController.dispose();
    _upiController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_isUpiMode) {
      if (_upiFormKey.currentState!.validate()) {
        final upi = _upiController.text.trim();
        debugPrint('[BankDetailsScreen] Submitting UPI ID: $upi');
        widget.onSave(upiId: upi);
      }
    } else {
      if (_bankFormKey.currentState!.validate()) {
        final holder = _holderController.text.trim();
        final bank = _bankNameController.text.trim();
        final acc = _accountController.text.trim();
        final ifsc = _ifscController.text.trim().toUpperCase();
        debugPrint(
          '[BankDetailsScreen] Submitting Bank details. Holder: $holder, Bank: $bank, Account: $acc, IFSC: $ifsc',
        );
        widget.onSave(
          holder: holder,
          bankName: bank,
          accountNumber: acc,
          ifscCode: ifsc,
        );
      }
    }
  }

  InputDecoration _buildDecoration({
    required String labelText,
    required IconData prefixIcon,
    String? hintText,
  }) {
    return InputDecoration(
      labelText: labelText,
      hintText: hintText,
      labelStyle: const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 14,
      ),
      floatingLabelStyle: const TextStyle(
        color: AppColors.primary,
        fontWeight: FontWeight.w600,
      ),
      prefixIcon: Icon(prefixIcon, color: AppColors.secondary, size: 22),
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.redAccent, width: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 12),
                    const Text(
                      'Direct Deposit & Payout',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Choose how you want to receive your trip earnings. Details are securely encrypted at rest.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Method Selector Toggle (Bank Account vs UPI)
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _isUpiMode = false),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: !_isUpiMode ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: !_isUpiMode
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.06),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.account_balance_rounded,
                                      size: 18,
                                      color: !_isUpiMode
                                          ? AppColors.primary
                                          : AppColors.textSecondary,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Bank Account',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: !_isUpiMode
                                            ? AppColors.primary
                                            : AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _isUpiMode = true),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: _isUpiMode ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: _isUpiMode
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.06),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.qr_code_rounded,
                                      size: 18,
                                      color: _isUpiMode
                                          ? AppColors.primary
                                          : AppColors.textSecondary,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'UPI ID (VPA)',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: _isUpiMode
                                            ? AppColors.primary
                                            : AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Mode Form
                    if (!_isUpiMode)
                      Form(
                        key: _bankFormKey,
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _holderController,
                              textCapitalization: TextCapitalization.words,
                              decoration: _buildDecoration(
                                labelText: 'Account Holder Name',
                                hintText: 'Name as registered with the bank',
                                prefixIcon: Icons.person_rounded,
                              ),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Please enter the account holder name';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _bankNameController,
                              textCapitalization: TextCapitalization.words,
                              decoration: _buildDecoration(
                                labelText: 'Bank Name',
                                hintText: 'e.g. State Bank of India, HDFC Bank',
                                prefixIcon: Icons.business_rounded,
                              ),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Please enter your bank name';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _accountController,
                              keyboardType: TextInputType.number,
                              decoration: _buildDecoration(
                                labelText: 'Account Number',
                                hintText: 'Enter 9 to 18 digit account number',
                                prefixIcon: Icons.credit_card_rounded,
                              ),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Please enter your account number';
                                }
                                final clean = val.trim();
                                if (clean.length < 9 || clean.length > 18) {
                                  return 'Account number must be 9 to 18 digits';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _ifscController,
                              textCapitalization: TextCapitalization.characters,
                              decoration: _buildDecoration(
                                labelText: 'IFSC / Routing Code',
                                hintText: 'e.g. SBIN0001234',
                                prefixIcon: Icons.pin_rounded,
                              ),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Please enter your IFSC / Routing code';
                                }
                                final clean = val.trim();
                                if (clean.length < 4 || clean.length > 15) {
                                  return 'Invalid routing / IFSC code length';
                                }
                                return null;
                              },
                            ),
                          ],
                        ),
                      )
                    else
                      Form(
                        key: _upiFormKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            TextFormField(
                              controller: _upiController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: _buildDecoration(
                                labelText: 'UPI ID (VPA Handle)',
                                hintText: 'e.g. drivername@okhdfcbank / phone@upi',
                                prefixIcon: Icons.alternate_email_rounded,
                              ),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Please enter your UPI ID';
                                }
                                final clean = val.trim();
                                if (!clean.contains('@') || clean.length < 5) {
                                  return 'Enter a valid UPI ID format (e.g. name@bank)';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFBBF7D0)),
                              ),
                              child: const Row(
                                children: [
                                  Icon(
                                    Icons.bolt_rounded,
                                    color: Color(0xFF16A34A),
                                    size: 20,
                                  ),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Instant payouts: Trip earnings are deposited immediately to your UPI linked bank account.',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF166534),
                                        height: 1.3,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 24),

                    // Security Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.lock_rounded,
                            size: 16,
                            color: Color(0xFF64748B),
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Bank details are encrypted using AES-256-GCM envelope encryption and verified via automated penny drop.',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Buttons
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  if (widget.onSkip != null) ...[
                    Expanded(
                      flex: 1,
                      child: OutlinedButton(
                        onPressed: widget.isLoading ? null : widget.onSkip,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Skip for now',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: widget.isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: widget.isLoading
                          ? const ThreeDotsLoader()
                          : const Text(
                              'Save & Continue',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
