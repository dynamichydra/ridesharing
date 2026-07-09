import 'package:flutter/material.dart';
import '../../style/appcolors.dart';

class EmergencyContactScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const EmergencyContactScreen({super.key, required this.onComplete});

  @override
  State<EmergencyContactScreen> createState() => _EmergencyContactScreenState();
}

class _EmergencyContactScreenState extends State<EmergencyContactScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  String _relationship = 'Spouse';

  void _submit() {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    debugPrint('[EmergencyContactScreen] Submit clicked. Name: $name, Phone: +91 $phone, Relationship: $_relationship');
    
    if (_formKey.currentState!.validate()) {
      widget.onComplete();
    } else {
      debugPrint('[EmergencyContactScreen] Validation failed');
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
            'Emergency Contact',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Provide a contact card we can notify in case of safety emergencies.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Contact Name'),
            validator: (val) => val == null || val.isEmpty ? 'Contact name is required' : null,
            onChanged: (val) => debugPrint('[EmergencyContactScreen] Name changed: $val'),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            value: _relationship,
            decoration: const InputDecoration(labelText: 'Relationship'),
            items: const [
              DropdownMenuItem(value: 'Spouse', child: Text('Spouse')),
              DropdownMenuItem(value: 'Parent', child: Text('Parent')),
              DropdownMenuItem(value: 'Sibling', child: Text('Sibling')),
              DropdownMenuItem(value: 'Friend', child: Text('Friend')),
              DropdownMenuItem(value: 'Other', child: Text('Other')),
            ],
            onChanged: (val) {
              debugPrint('[EmergencyContactScreen] Relationship selected: $val');
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
            decoration: const InputDecoration(
              labelText: 'Phone Number',
              prefixText: '+91 ',
              counterText: '',
            ),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Phone number is required';
              if (val.length != 10) return 'Must be a 10-digit number';
              return null;
            },
            onChanged: (val) => debugPrint('[EmergencyContactScreen] Phone changed: $val'),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: () {
              debugPrint('[EmergencyContactScreen] Save Contact Details button clicked');
              _submit();
            },
            child: const Text('Save Contact Details'),
          ),
        ],
      ),
    );
  }
}
