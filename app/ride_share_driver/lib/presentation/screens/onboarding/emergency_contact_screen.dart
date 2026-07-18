import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';

class EmergencyContactScreen extends StatefulWidget {
  final String? initialName;
  final String? initialPhone;
  final String? initialRelationship;
  final VoidCallback? onSkip;
  final Function({
    required String name,
    required String phone,
    required String relationship,
  })
  onSave;

  const EmergencyContactScreen({
    super.key,
    this.initialName,
    this.initialPhone,
    this.initialRelationship,
    this.onSkip,
    required this.onSave,
  });

  @override
  State<EmergencyContactScreen> createState() => _EmergencyContactScreenState();
}

class _EmergencyContactScreenState extends State<EmergencyContactScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late String _relationship;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _phoneController = TextEditingController(text: widget.initialPhone);
    _relationship = widget.initialRelationship ?? 'Spouse';
  }

  void _submit() {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    debugPrint(
      '[EmergencyContactScreen] Submit clicked. Name: $name, Phone: +91 $phone, Relationship: $_relationship',
    );

    if (_formKey.currentState!.validate()) {
      widget.onSave(name: name, phone: phone, relationship: _relationship);
    } else {
      debugPrint('[EmergencyContactScreen] Validation failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Modern input decoration builder
    InputDecoration buildModernInputDecoration({
      required String labelText,
      required IconData prefixIcon,
      String? prefixText,
      String? counterText,
    }) {
      return InputDecoration(
        labelText: labelText,
        labelStyle: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 14,
        ),
        floatingLabelStyle: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
        ),
        prefixIcon: Icon(prefixIcon, color: AppColors.secondary, size: 22),
        prefixText: prefixText,
        prefixStyle: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        counterText: counterText,
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
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
            'Emergency Contact',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Provide a contact card we can notify in case of safety emergencies.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: _nameController,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Contact Name',
              prefixIcon: Icons.person_outline_rounded,
            ),
            validator: (val) =>
                val == null || val.isEmpty ? 'Contact name is required' : null,
            onChanged: (val) =>
                debugPrint('[EmergencyContactScreen] Name changed: $val'),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            value: _relationship,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Relationship',
              prefixIcon: Icons.people_outline_rounded,
            ),
            items: const [
              DropdownMenuItem(value: 'Spouse', child: Text('Spouse')),
              DropdownMenuItem(value: 'Parent', child: Text('Parent')),
              DropdownMenuItem(value: 'Sibling', child: Text('Sibling')),
              DropdownMenuItem(value: 'Friend', child: Text('Friend')),
              DropdownMenuItem(value: 'Other', child: Text('Other')),
            ],
            onChanged: (val) {
              debugPrint(
                '[EmergencyContactScreen] Relationship selected: $val',
              );
              if (val != null) {
                setState(() {
                  _relationship = val;
                });
              }
            },
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            maxLength: 10,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Phone Number',
              prefixIcon: Icons.phone_outlined,
              prefixText: '+91 ',
              counterText: '',
            ),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Phone number is required';
              if (val.length != 10) return 'Must be a 10-digit number';
              return null;
            },
            onChanged: (val) =>
                debugPrint('[EmergencyContactScreen] Phone changed: $val'),
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
                        side: const BorderSide(
                          color: AppColors.border,
                          width: 1.5,
                        ),
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
                        '[EmergencyContactScreen] Save Contact Details button clicked',
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
