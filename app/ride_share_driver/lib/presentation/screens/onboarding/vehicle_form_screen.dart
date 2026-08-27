import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/vehicle.dart';
import 'widgets/three_dots_loader.dart';

class VehicleFormScreen extends StatefulWidget {
  final List<VehicleType> vehicleTypes;
  final String? initialVehicleTypeId;
  final String? initialModel;
  final String? initialYear;
  final String? initialRegistrationNumber;
  final String? initialColor;
  final bool isLoading;
  final Function({
    required String vehicleTypeId,
    required String model,
    required String year,
    required String registrationNumber,
    String? color,
  })
  onSave;

  const VehicleFormScreen({
    super.key,
    required this.vehicleTypes,
    this.initialVehicleTypeId,
    this.initialModel,
    this.initialYear,
    this.initialRegistrationNumber,
    this.initialColor,
    this.isLoading = false,
    required this.onSave,
  });

  @override
  State<VehicleFormScreen> createState() => _VehicleFormScreenState();
}

class _VehicleFormScreenState extends State<VehicleFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _modelController;
  late final TextEditingController _regNumberController;

  String? _selectedVehicleTypeId;
  late String _selectedYear;
  late String _selectedColor;

  final List<String> _colors = [
    'White',
    'Silver',
    'Black',
    'Blue',
    'Grey',
    'Yellow',
  ];
  final List<String> _years = [
    '2026',
    '2025',
    '2024',
    '2023',
    '2022',
    '2021',
    '2020',
    '2019',
  ];

  @override
  void initState() {
    super.initState();
    _modelController = TextEditingController(text: widget.initialModel);
    _regNumberController = TextEditingController(
      text: widget.initialRegistrationNumber,
    );
    _selectedYear = widget.initialYear ?? '2025';
    _selectedColor = widget.initialColor ?? 'White';

    if (widget.initialVehicleTypeId != null) {
      _selectedVehicleTypeId = widget.initialVehicleTypeId;
    } else if (widget.vehicleTypes.isNotEmpty) {
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
    debugPrint(
      '[VehicleFormScreen] Submit clicked. Category: $_selectedVehicleTypeId, Model: $model, Reg: $reg, Year: $_selectedYear, Color: $_selectedColor',
    );

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
          const Text(
            'Vehicle Details',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Enter the details of the vehicle you will drive.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),

          // Vehicle Category Dropdown
          DropdownButtonFormField<String>(
            value: _selectedVehicleTypeId,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Vehicle Category',
              prefixIcon: Icons.category_outlined,
            ),
            items: widget.vehicleTypes
                .map((t) => DropdownMenuItem(value: t.id, child: Text(t.name)))
                .toList(),
            onChanged: (val) {
              debugPrint('[VehicleFormScreen] Vehicle category selected: $val');
              setState(() {
                _selectedVehicleTypeId = val;
              });
            },
          ),
          const SizedBox(height: 20),

          // Model Input Field
          TextFormField(
            controller: _modelController,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Vehicle Make & Model (e.g. Honda Amaze)',
              prefixIcon: Icons.directions_car_outlined,
            ),
            validator: (val) =>
                val == null || val.isEmpty ? 'Model is required' : null,
            onChanged: (val) =>
                debugPrint('[VehicleFormScreen] Model changed: $val'),
          ),
          const SizedBox(height: 20),

          // Registration Plate Number Field
          TextFormField(
            controller: _regNumberController,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Registration Plate Number (e.g. KA-01-AB-1234)',
              prefixIcon: Icons.subtitles_outlined,
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Registration number is required';
              }
              return null;
            },
            onChanged: (val) =>
                debugPrint('[VehicleFormScreen] Reg number changed: $val'),
          ),
          const SizedBox(height: 20),

          // Year and Color Row
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedYear,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                  ),
                  decoration: buildModernInputDecoration(
                    labelText: 'Year',
                    prefixIcon: Icons.calendar_today_outlined,
                  ),
                  items: _years
                      .map((y) => DropdownMenuItem(value: y, child: Text(y)))
                      .toList(),
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
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                  ),
                  decoration: buildModernInputDecoration(
                    labelText: 'Color',
                    prefixIcon: Icons.palette_outlined,
                  ),
                  items: _colors
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
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

          // Submit Button
          SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: widget.isLoading
                  ? null
                  : () {
                      debugPrint(
                        '[VehicleFormScreen] Save & Continue button clicked',
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
              child: widget.isLoading
                  ? const ThreeDotsLoader()
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Save & Continue',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 20),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
