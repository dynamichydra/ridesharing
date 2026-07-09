import 'package:flutter/material.dart';
import '../../style/appcolors.dart';

class PersonalInfoScreen extends StatefulWidget {
  final Function({required String name, required String email, String? dob, String? gender, String? referralCode}) onSave;

  const PersonalInfoScreen({super.key, required this.onSave});

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(text: 'Arijit Bose');
  final _emailController = TextEditingController(text: 'arijit.bose.sit@gmail.com');
  final _referralController = TextEditingController();
  
  String? _selectedGender = 'male';
  DateTime? _selectedDateOfBirth = DateTime(1995, 8, 15);

  Future<void> _selectDate(BuildContext context) async {
    debugPrint('[PersonalInfoScreen] Date of birth picker clicked');
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateOfBirth ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1950, 1, 1),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)), // 18+ check
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
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
    debugPrint('[PersonalInfoScreen] Submit clicked. name: $name, email: $email, gender: $_selectedGender, referral: $ref');
    
    if (_formKey.currentState!.validate()) {
      String? dobString;
      if (_selectedDateOfBirth != null) {
        dobString = "${_selectedDateOfBirth!.year}-${_selectedDateOfBirth!.month.toString().padLeft(2, '0')}-${_selectedDateOfBirth!.day.toString().padLeft(2, '0')}";
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

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(24.0),
        children: [
          const Text(
            'Personal Details',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Provide your personal credentials to verify your profile details.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Full Name (as in Aadhar/License)'),
            validator: (val) => val == null || val.isEmpty ? 'Name is required' : null,
            onChanged: (val) => debugPrint('[PersonalInfoScreen] Name changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email Address'),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Email is required';
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(val)) return 'Invalid email';
              return null;
            },
            onChanged: (val) => debugPrint('[PersonalInfoScreen] Email changed: $val'),
          ),
          const SizedBox(height: 20),
          InkWell(
            onTap: () => _selectDate(context),
            borderRadius: BorderRadius.circular(12),
            child: InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Date of Birth',
                suffixIcon: Icon(Icons.calendar_today_rounded, color: AppColors.primary),
              ),
              child: Text(
                dobText,
                style: const TextStyle(fontSize: 16),
              ),
            ),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            value: _selectedGender,
            decoration: const InputDecoration(labelText: 'Gender'),
            items: const [
              DropdownMenuItem(value: 'male', child: Text('Male')),
              DropdownMenuItem(value: 'female', child: Text('Female')),
              DropdownMenuItem(value: 'other', child: Text('Other')),
            ],
            onChanged: (val) {
              debugPrint('[PersonalInfoScreen] Gender selected: $val');
              setState(() {
                _selectedGender = val;
              });
            },
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _referralController,
            decoration: const InputDecoration(labelText: 'Referral Code (Optional)'),
            onChanged: (val) => debugPrint('[PersonalInfoScreen] Referral changed: $val'),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: () {
              debugPrint('[PersonalInfoScreen] Save & Continue clicked');
              _submit();
            },
            child: const Text('Save & Continue'),
          ),
        ],
      ),
    );
  }
}
