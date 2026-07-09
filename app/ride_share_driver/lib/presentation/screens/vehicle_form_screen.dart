import 'package:flutter/material.dart';
import '../../style/appcolors.dart';
import '../../domain/entities/vehicle.dart';

class VehicleFormScreen extends StatefulWidget {
  final List<VehicleType> vehicleTypes;
  final Function({required String vehicleTypeId, required String model, required String year, required String registrationNumber, String? color}) onSave;

  const VehicleFormScreen({
    super.key,
    required this.vehicleTypes,
    required this.onSave,
  });

  @override
  State<VehicleFormScreen> createState() => _VehicleFormScreenState();
}

class _VehicleFormScreenState extends State<VehicleFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _modelController = TextEditingController(text: 'Maruti Swift Dzire');
  final _regNumberController = TextEditingController(text: 'KA-01-AB-1234');
  
  String? _selectedVehicleTypeId;
  String _selectedYear = '2023';
  String _selectedColor = 'White';

  final List<String> _colors = ['White', 'Silver', 'Black', 'Blue', 'Grey', 'Yellow'];
  final List<String> _years = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019'];

  @override
  void initState() {
    super.initState();
    // Default vehicle type to Cab / Sedan
    if (widget.vehicleTypes.isNotEmpty) {
      final cab = widget.vehicleTypes.firstWhere(
        (v) => v.slug == 'cab' || v.name.toLowerCase().contains('cab'),
        orElse: () => widget.vehicleTypes.first,
      );
      _selectedVehicleTypeId = cab.id;
    }
  }

  void _submit() {
    final model = _modelController.text.trim();
    final reg = _regNumberController.text.trim();
    debugPrint('[VehicleFormScreen] Submit clicked. Category: $_selectedVehicleTypeId, Model: $model, Reg: $reg, Year: $_selectedYear, Color: $_selectedColor');
    
    if (_formKey.currentState!.validate() && _selectedVehicleTypeId != null) {
      widget.onSave(
        vehicleTypeId: _selectedVehicleTypeId!,
        model: model,
        year: _selectedYear,
        registrationNumber: reg.toUpperCase(),
        color: _selectedColor,
      );
    } else {
      debugPrint('[VehicleFormScreen] Validation failed');
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
            'Vehicle Details',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Enter the details of the vehicle you will drive.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          DropdownButtonFormField<String>(
            value: _selectedVehicleTypeId,
            decoration: const InputDecoration(labelText: 'Vehicle Category'),
            items: widget.vehicleTypes.map((t) => DropdownMenuItem(value: t.id, child: Text(t.name))).toList(),
            onChanged: (val) {
              debugPrint('[VehicleFormScreen] Vehicle category selected: $val');
              setState(() {
                _selectedVehicleTypeId = val;
              });
            },
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _modelController,
            decoration: const InputDecoration(labelText: 'Vehicle Make & Model (e.g. Honda Amaze)'),
            validator: (val) => val == null || val.isEmpty ? 'Model is required' : null,
            onChanged: (val) => debugPrint('[VehicleFormScreen] Model changed: $val'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _regNumberController,
            decoration: const InputDecoration(labelText: 'Registration Plate Number (e.g. KA-01-MX-1234)'),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Registration number is required';
              // Standard Indian plate check (simplified regex)
              if (!RegExp(r'^[a-zA-Z]{2}[0-9a-zA-Z- ]{2,12}$').hasMatch(val)) return 'Invalid plate format';
              return null;
            },
            onChanged: (val) => debugPrint('[VehicleFormScreen] Reg number changed: $val'),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedYear,
                  decoration: const InputDecoration(labelText: 'Year'),
                  items: _years.map((y) => DropdownMenuItem(value: y, child: Text(y))).toList(),
                  onChanged: (val) {
                    debugPrint('[VehicleFormScreen] Year selected: $val');
                    if (val != null) {
                      setState(() {
                        _selectedYear = val;
                      });
                    }
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedColor,
                  decoration: const InputDecoration(labelText: 'Color'),
                  items: _colors.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (val) {
                    debugPrint('[VehicleFormScreen] Color selected: $val');
                    if (val != null) {
                      setState(() {
                        _selectedColor = val;
                      });
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: () {
              debugPrint('[VehicleFormScreen] Save & Continue button clicked');
              _submit();
            },
            child: const Text('Save & Continue'),
          ),
        ],
      ),
    );
  }
}
