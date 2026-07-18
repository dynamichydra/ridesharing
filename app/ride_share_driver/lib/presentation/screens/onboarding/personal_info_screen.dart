import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';

class PersonalInfoScreen extends StatefulWidget {
  final String? initialName;
  final String? initialEmail;
  final String? initialDob;
  final String? initialGender;
  final String? initialReferralCode;
  final Function({
    required String name,
    required String email,
    String? dob,
    String? gender,
    String? referralCode,
  })
  onSave;

  const PersonalInfoScreen({
    super.key,
    this.initialName,
    this.initialEmail,
    this.initialDob,
    this.initialGender,
    this.initialReferralCode,
    required this.onSave,
  });

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _referralController;

  String? _selectedGender;
  DateTime? _selectedDateOfBirth;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _emailController = TextEditingController(text: widget.initialEmail);
    _referralController = TextEditingController(
      text: widget.initialReferralCode,
    );
    _selectedGender = widget.initialGender ?? 'male';
    if (widget.initialDob != null) {
      _selectedDateOfBirth = DateTime.tryParse(widget.initialDob!);
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    debugPrint('[PersonalInfoScreen] Date of birth picker clicked');
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateOfBirth ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1950, 1, 1),
      lastDate: DateTime.now().subtract(
        const Duration(days: 365 * 18),
      ), // 18+ check
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            useMaterial3: true,
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              secondary: AppColors.secondary,
              onSecondary: Colors.white,
              surface: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
            dialogTheme: DialogThemeData(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              elevation: 8,
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: AppColors.secondary,
                textStyle: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDateOfBirth) {
      debugPrint('[PersonalInfoScreen] Date selected: $picked');
      setState(() {
        _selectedDateOfBirth = picked;
      });
    }
  }

  void _submit() {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final ref = _referralController.text.trim();
    debugPrint(
      '[PersonalInfoScreen] Submit clicked. name: $name, email: $email, gender: $_selectedGender, referral: $ref',
    );

    if (_formKey.currentState!.validate()) {
      String? dobString;
      if (_selectedDateOfBirth != null) {
        dobString =
            "${_selectedDateOfBirth!.year}-${_selectedDateOfBirth!.month.toString().padLeft(2, '0')}-${_selectedDateOfBirth!.day.toString().padLeft(2, '0')}";
      }

      widget.onSave(
        name: name,
        email: email,
        dob: dobString,
        gender: _selectedGender,
        referralCode: ref.isEmpty ? null : ref,
      );
    } else {
      debugPrint('[PersonalInfoScreen] Validation failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    final dobText = _selectedDateOfBirth == null
        ? 'Select Date of Birth'
        : "${_selectedDateOfBirth!.day.toString().padLeft(2, '0')}/${_selectedDateOfBirth!.month.toString().padLeft(2, '0')}/${_selectedDateOfBirth!.year}";

    final theme = Theme.of(context);

    // Modern input decoration builder
    InputDecoration buildModernInputDecoration({
      required String labelText,
      required IconData prefixIcon,
      Widget? suffixIcon,
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
        suffixIcon: suffixIcon,
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
          // Header Illustration / Icon Badge
          const Text(
            'Personal Details',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Provide your personal credentials to verify your profile details.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),

          // Name Field
          TextFormField(
            controller: _nameController,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Full Name (as in Aadhar/License)',
              prefixIcon: Icons.person_outline_rounded,
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'Name is required';
              if (!RegExp(r"^[a-zA-Z\s]{2,50}$").hasMatch(val.trim())) {
                return 'Please enter a valid name (letters and spaces only)';
              }
              return null;
            },
            onChanged: (val) =>
                debugPrint('[PersonalInfoScreen] Name changed: $val'),
          ),
          const SizedBox(height: 20),

          // Email Field
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Email Address',
              prefixIcon: Icons.email_outlined,
            ),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Email is required';
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(val)) {
                return 'Invalid email';
              }
              return null;
            },
            onChanged: (val) =>
                debugPrint('[PersonalInfoScreen] Email changed: $val'),
          ),
          const SizedBox(height: 20),

          // Date of Birth Button/Field
          InkWell(
            onTap: () => _selectDate(context),
            borderRadius: BorderRadius.circular(12),
            child: InputDecorator(
              decoration: buildModernInputDecoration(
                labelText: 'Date of Birth',
                prefixIcon: Icons.calendar_today_outlined,
              ),
              child: Text(
                dobText,
                style: TextStyle(
                  fontSize: 16,
                  color: _selectedDateOfBirth == null
                      ? AppColors.textSecondary.withOpacity(0.8)
                      : AppColors.textPrimary,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Gender Selection Header
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'Gender',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),

          // Modern Segmented Gender Selection Chips
          Row(
            children: [
              _buildGenderChip('male', 'Male', Icons.male_rounded),
              const SizedBox(width: 12),
              _buildGenderChip('female', 'Female', Icons.female_rounded),
              const SizedBox(width: 12),
              _buildGenderChip('other', 'Other', Icons.transgender_rounded),
            ],
          ),
          const SizedBox(height: 24),

          // Referral Code Field
          TextFormField(
            controller: _referralController,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Referral Code (Optional)',
              prefixIcon: Icons.card_giftcard_rounded,
            ),
            onChanged: (val) =>
                debugPrint('[PersonalInfoScreen] Referral changed: $val'),
          ),
          const SizedBox(height: 40),

          // Submit Button
          Container(
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: AppColors.primary,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ElevatedButton(
              onPressed: () {
                debugPrint('[PersonalInfoScreen] Save & Continue clicked');
                _submit();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Save & Continue',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(width: 8),
                  Icon(
                    Icons.arrow_forward_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGenderChip(String value, String label, IconData icon) {
    final isSelected = _selectedGender == value;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          debugPrint('[PersonalInfoScreen] Gender selected: $value');
          setState(() {
            _selectedGender = value;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary.withOpacity(0.02)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isSelected
                    ? AppColors.secondary
                    : AppColors.textSecondary,
                size: 24,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected
                      ? AppColors.secondary
                      : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
