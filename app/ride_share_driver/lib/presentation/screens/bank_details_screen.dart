import 'package:flutter/material.dart';
import '../../style/appcolors.dart';

class BankDetailsScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const BankDetailsScreen({super.key, required this.onComplete});

  @override
  State<BankDetailsScreen> createState() => _BankDetailsScreenState();
}

class _BankDetailsScreenState extends State<BankDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _bankNameController = TextEditingController(text: 'State Bank of India');
  final _holderController = TextEditingController(text: 'Arijit Bose');
  final _accountController = TextEditingController();
  final _ifscController = TextEditingController();

  void _submit() {
    final holder = _holderController.text.trim();
    final bank = _bankNameController.text.trim();
    final acc = _accountController.text.trim();
    final ifsc = _ifscController.text.trim();
    debugPrint('[BankDetailsScreen] Submit clicked. Holder: $holder, Bank: $bank, Account: $acc, IFSC: $ifsc');
    
    if (_formKey.currentState!.validate()) {
      // Direct payouts configuration mock success response
      widget.onComplete();
    } else {
      debugPrint('[BankDetailsScreen] Validation failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(24.0),
        children: [
          const Text(
            'Bank Account Details',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add your active bank account for weekly payouts.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: _holderController,
            decoration: const InputDecoration(labelText: 'Account Holder Name'),
            validator: (val) => val == null || val.isEmpty ? 'Account holder is required' : null,
            onChanged: (val) => debugPrint('[BankDetailsScreen] Holder changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _bankNameController,
            decoration: const InputDecoration(labelText: 'Bank Name'),
            validator: (val) => val == null || val.isEmpty ? 'Bank name is required' : null,
            onChanged: (val) => debugPrint('[BankDetailsScreen] Bank name changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _accountController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Account Number'),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Account number is required';
              if (val.length < 9 || val.length > 18) return 'Must be between 9 and 18 digits';
              return null;
            },
            onChanged: (val) => debugPrint('[BankDetailsScreen] Account changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _ifscController,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(labelText: 'IFSC Code (e.g. SBIN0001234)'),
            validator: (val) {
              if (val == null || val.isEmpty) return 'IFSC code is required';
              // Indian IFSC verification standard regex
              if (!RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$').hasMatch(val.toUpperCase())) {
                return 'Invalid Indian IFSC code format';
              }
              return null;
            },
            onChanged: (val) => debugPrint('[BankDetailsScreen] IFSC changed: $val'),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: () {
              debugPrint('[BankDetailsScreen] Save Bank Details button clicked');
              _submit();
            },
            child: const Text('Save Bank Details'),
          ),
        ],
      ),
    );
  }
}
