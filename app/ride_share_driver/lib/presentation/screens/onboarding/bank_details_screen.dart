import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';

class BankDetailsScreen extends StatefulWidget {
  final String? initialHolder;
  final String? initialBankName;
  final String? initialAccount;
  final String? initialIfsc;
  final VoidCallback? onSkip;
  final Function({
    required String holder,
    required String bankName,
    required String accountNumber,
    required String ifscCode,
  })
  onSave;

  const BankDetailsScreen({
    super.key,
    this.initialHolder,
    this.initialBankName,
    this.initialAccount,
    this.initialIfsc,
    this.onSkip,
    required this.onSave,
  });

  @override
  State<BankDetailsScreen> createState() => _BankDetailsScreenState();
}

class _BankDetailsScreenState extends State<BankDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _bankNameController;
  late final TextEditingController _holderController;
  late final TextEditingController _accountController;
  late final TextEditingController _ifscController;

  @override
  void initState() {
    super.initState();
    _bankNameController = TextEditingController(text: widget.initialBankName);
    _holderController = TextEditingController(text: widget.initialHolder);
    _accountController = TextEditingController(text: widget.initialAccount);
    _ifscController = TextEditingController(text: widget.initialIfsc);
  }

  void _submit() {
    final holder = _holderController.text.trim();
    final bank = _bankNameController.text.trim();
    final acc = _accountController.text.trim();
    final ifsc = _ifscController.text.trim();
    debugPrint(
      '[BankDetailsScreen] Submit clicked. Holder: $holder, Bank: $bank, Account: $acc, IFSC: $ifsc',
    );

    if (_formKey.currentState!.validate()) {
      widget.onSave(
        holder: holder,
        bankName: bank,
        accountNumber: acc,
        ifscCode: ifsc.toUpperCase(),
      );
    } else {
      debugPrint('[BankDetailsScreen] Validation failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Modern input decoration builder
    InputDecoration buildModernInputDecoration({
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
          borderSide: const BorderSide(color: AppColors.error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
      );
    }

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(24.0),
        physics: const BouncingScrollPhysics(),
        children: [
          const Text(
            'Bank Account Details',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add your active bank account for weekly payouts.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: _holderController,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Account Holder Name',
              prefixIcon: Icons.person_outline_rounded,
            ),
            validator: (val) => val == null || val.isEmpty
                ? 'Account holder is required'
                : null,
            onChanged: (val) =>
                debugPrint('[BankDetailsScreen] Holder changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _bankNameController,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Bank Name',
              prefixIcon: Icons.account_balance_outlined,
            ),
            validator: (val) =>
                val == null || val.isEmpty ? 'Bank name is required' : null,
            onChanged: (val) =>
                debugPrint('[BankDetailsScreen] Bank name changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _accountController,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Account Number',
              prefixIcon: Icons.credit_card_outlined,
            ),
            validator: (val) {
              if (val == null || val.isEmpty) {
                return 'Account number is required';
              }
              if (val.length < 9 || val.length > 18) {
                return 'Must be between 9 and 18 digits';
              }
              return null;
            },
            onChanged: (val) =>
                debugPrint('[BankDetailsScreen] Account changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _ifscController,
            textCapitalization: TextCapitalization.characters,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'IFSC Code',
              prefixIcon: Icons.code_outlined,
              hintText: 'e.g. SBIN0001234',
            ),
            validator: (val) {
              if (val == null || val.isEmpty) return 'IFSC code is required';
              if (!RegExp(
                r'^[A-Z]{4}0[A-Z0-9]{6}$',
              ).hasMatch(val.toUpperCase())) {
                return 'Invalid Indian IFSC code format';
              }
              return null;
            },
            onChanged: (val) =>
                debugPrint('[BankDetailsScreen] IFSC changed: $val'),
          ),
          const SizedBox(height: 40),
          
          // Action Buttons
          Row(
            children: [
              if (widget.onSkip != null) ...[
                Expanded(
                  child: SizedBox(
                    height: 56,
                    child: OutlinedButton(
                      onPressed: widget.onSkip,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.textSecondary,
                        side: const BorderSide(color: AppColors.border, width: 1.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Skip',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
              ],
              Expanded(
                flex: widget.onSkip != null ? 2 : 1,
                child: SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      debugPrint(
                        '[BankDetailsScreen] Save Bank Details button clicked',
                      );
                      _submit();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 2,
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Save Details',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(width: 6),
                        Icon(Icons.check_circle_outline_rounded, size: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
