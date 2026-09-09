import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/vehicle.dart';
import '../../../domain/entities/vehicle_model.dart';
import '../../../domain/repositories/onboarding_repository.dart';
import '../../../common/widgets/custom_toast.dart';
import '../../../injection_container.dart';
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
    String? vehicleModelId,
    required String model,
    required String year,
    required String registrationNumber,
    String? color,
    String? image,
  }) onSave;

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
  String? _selectedVehicleModelId;
  late String _selectedYear;
  late String _selectedColor;

  // Search & suggestions state
  List<VehicleModel> _modelSuggestions = [];
  bool _isLoadingModels = false;
  bool _showSuggestions = false;
  Timer? _debounceTimer;
  final LayerLink _layerLink = LayerLink();
  final FocusNode _modelFocusNode = FocusNode();

  // Vehicle photo state
  Uint8List? _vehiclePhotoBytes;
  String? _vehiclePhotoContentType;
  bool _isUploadingPhoto = false;
  final ImagePicker _imagePicker = ImagePicker();

  final List<String> _colors = [
    'White',
    'Silver',
    'Black',
    'Blue',
    'Grey',
    'Yellow',
    'Red',
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
    _selectedVehicleTypeId = widget.initialVehicleTypeId;

    _modelFocusNode.addListener(() {
      if (_modelFocusNode.hasFocus) {
        _searchModels(_modelController.text, showDropdown: true);
      } else {
        // Small delay so item taps can register
        Future.delayed(const Duration(milliseconds: 200), () {
          if (mounted) {
            setState(() {
              _showSuggestions = false;
            });
          }
        });
      }
    });

    // Preload models in background without opening dropdown
    _searchModels('', showDropdown: false);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _modelFocusNode.dispose();
    _modelController.dispose();
    _regNumberController.dispose();
    super.dispose();
  }

  void _onModelChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _searchModels(query, showDropdown: _modelFocusNode.hasFocus);
    });
  }

  Future<void> _searchModels(String query, {bool showDropdown = true}) async {
    setState(() {
      _isLoadingModels = true;
      if (showDropdown && _modelFocusNode.hasFocus) {
        _showSuggestions = true;
      }
    });

    try {
      final repo = sl<OnboardingRepository>();
      final results = await repo.getVehicleModels(
        search: query.trim().isNotEmpty ? query.trim() : null,
      );

      if (mounted) {
        setState(() {
          _modelSuggestions = results;
          _isLoadingModels = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingModels = false;
        });
      }
    }
  }

  void _selectVehicleModel(VehicleModel model) {
    setState(() {
      _selectedVehicleModelId = model.id;
      _modelController.text = model.displayName;
      _showSuggestions = false;

      // Automatically resolve and set the vehicle category
      _selectedVehicleTypeId = model.vehicleTypeId;
    });
    _modelFocusNode.unfocus();
    debugPrint(
      '[VehicleFormScreen] Auto-selected Category: ${model.vehicleTypeId} (${model.vehicleType?.name}) for model: ${model.displayName}',
    );
  }

  VehicleType? get _currentVehicleType {
    if (_selectedVehicleTypeId == null) return null;
    try {
      return widget.vehicleTypes.firstWhere((t) => t.id == _selectedVehicleTypeId);
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickVehiclePhoto(ImageSource source) async {
    try {
      final XFile? file = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 85,
      );

      if (file == null) return;

      final bytes = await file.readAsBytes();
      String contentType = 'image/jpeg';
      final pathLower = file.path.toLowerCase();
      if (pathLower.endsWith('.png')) {
        contentType = 'image/png';
      }

      setState(() {
        _vehiclePhotoBytes = bytes;
        _vehiclePhotoContentType = contentType;
      });
    } catch (e) {
      if (mounted) {
        CustomToast.show(context, 'Failed to pick photo: $e');
      }
    }
  }

  void _showPhotoOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Upload Vehicle Photo',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded, color: AppColors.primary),
                title: const Text('Take Photo with Camera'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickVehiclePhoto(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded, color: AppColors.primary),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickVehiclePhoto(ImageSource.gallery);
                },
              ),
              if (_vehiclePhotoBytes != null)
                ListTile(
                  leading: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
                  title: const Text('Remove Photo', style: TextStyle(color: Colors.redAccent)),
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _vehiclePhotoBytes = null;
                      _vehiclePhotoContentType = null;
                    });
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final model = _modelController.text.trim();
    final reg = _regNumberController.text.trim();

    if (_selectedVehicleTypeId == null) {
      CustomToast.show(context, 'Please select a vehicle model or category');
      return;
    }

    if (_formKey.currentState!.validate()) {
      String? uploadedImageUrl;

      if (_vehiclePhotoBytes != null && _vehiclePhotoContentType != null) {
        setState(() {
          _isUploadingPhoto = true;
        });

        try {
          final repo = sl<OnboardingRepository>();
          uploadedImageUrl = await repo.uploadVehiclePhoto(
            bytes: _vehiclePhotoBytes!,
            contentType: _vehiclePhotoContentType!,
          );
        } catch (e) {
          debugPrint('[VehicleFormScreen] Photo upload failed: $e');
          // Proceed with vehicle registration even if photo upload fails or fallback
        } finally {
          if (mounted) {
            setState(() {
              _isUploadingPhoto = false;
            });
          }
        }
      }

      widget.onSave(
        vehicleTypeId: _selectedVehicleTypeId!,
        vehicleModelId: _selectedVehicleModelId,
        model: model,
        year: _selectedYear,
        registrationNumber: reg.toUpperCase(),
        color: _selectedColor,
        image: uploadedImageUrl,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentType = _currentVehicleType;
    final isBusy = widget.isLoading || _isUploadingPhoto;

    InputDecoration buildModernInputDecoration({
      required String labelText,
      required IconData prefixIcon,
      String? hintText,
      Widget? suffixIcon,
      String? helperText,
    }) {
      return InputDecoration(
        labelText: labelText,
        hintText: hintText,
        helperText: helperText,
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
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
      );
    }

    return Form(
      key: _formKey,
      child: GestureDetector(
        onTap: () {
          _modelFocusNode.unfocus();
          setState(() {
            _showSuggestions = false;
          });
        },
        behavior: HitTestBehavior.opaque,
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
              'Search your vehicle make and model. Category is detected automatically.',
              style: TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),

            // 1. Vehicle Photo Upload Card
            GestureDetector(
              onTap: isBusy ? null : _showPhotoOptions,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _vehiclePhotoBytes != null
                      ? Colors.white
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _vehiclePhotoBytes != null
                        ? AppColors.primary
                        : AppColors.border,
                    width: _vehiclePhotoBytes != null ? 1.5 : 1,
                  ),
                ),
                child: _vehiclePhotoBytes != null
                    ? Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.memory(
                              _vehiclePhotoBytes!,
                              width: 80,
                              height: 60,
                              fit: BoxFit.cover,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Vehicle Photo Selected',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Tap to change or remove',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.primary.withOpacity(0.8),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                            onPressed: _showPhotoOptions,
                          ),
                        ],
                      )
                    : Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.add_a_photo_rounded,
                              color: AppColors.primary,
                              size: 26,
                            ),
                          ),
                          const SizedBox(width: 14),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Upload Vehicle Photo',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                SizedBox(height: 3),
                                Text(
                                  'Clear front/side photo of your car (Optional)',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right_rounded,
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 20),

            // 2. Vehicle Model Search Field with Suggestions
            CompositedTransformTarget(
              link: _layerLink,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _modelController,
                    focusNode: _modelFocusNode,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                    decoration: buildModernInputDecoration(
                      labelText: 'Vehicle Make & Model',
                      hintText: 'Search model (e.g. Swift, Honda Amaze, Splendor)',
                      prefixIcon: Icons.search_rounded,
                      suffixIcon: _isLoadingModels
                          ? const Padding(
                              padding: EdgeInsets.all(12.0),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : (_modelController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 20, color: AppColors.textSecondary),
                                  onPressed: () {
                                    _modelController.clear();
                                    setState(() {
                                      _selectedVehicleModelId = null;
                                    });
                                    _searchModels('');
                                  },
                                )
                              : const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary)),
                    ),
                    validator: (val) =>
                        val == null || val.trim().isEmpty ? 'Please enter or select a vehicle model' : null,
                    onChanged: _onModelChanged,
                  ),

                  // Inline suggestions container
                  if (_showSuggestions && _modelSuggestions.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 6),
                      constraints: const BoxConstraints(maxHeight: 220),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.08),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: ListView.separated(
                          shrinkWrap: true,
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          itemCount: _modelSuggestions.length,
                          separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          itemBuilder: (context, index) {
                            final item = _modelSuggestions[index];
                            final isSelected = item.id == _selectedVehicleModelId;

                            // Resolve category name
                            String catName = item.vehicleType?.name ?? '';
                            if (catName.isEmpty) {
                              try {
                                catName = widget.vehicleTypes.firstWhere((t) => t.id == item.vehicleTypeId).name;
                              } catch (_) {}
                            }

                            return Material(
                              color: isSelected ? AppColors.primary.withOpacity(0.08) : Colors.transparent,
                              child: InkWell(
                                onTap: () => _selectVehicleModel(item),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: AppColors.surface,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: const Icon(
                                          Icons.directions_car_filled_rounded,
                                          size: 18,
                                          color: AppColors.secondary,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.displayName,
                                              style: TextStyle(
                                                fontSize: 15,
                                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                                color: isSelected ? AppColors.primary : AppColors.textPrimary,
                                              ),
                                            ),
                                            if (item.brand.isNotEmpty)
                                              Text(
                                                item.brand,
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  color: AppColors.textSecondary,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                      if (catName.isNotEmpty)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            catName,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Vehicle Category Display (Auto-Selected with Dropdown fallback)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: _selectedVehicleTypeId != null
                    ? AppColors.primary.withOpacity(0.04)
                    : AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _selectedVehicleTypeId != null
                      ? AppColors.primary.withOpacity(0.3)
                      : AppColors.border,
                  width: _selectedVehicleTypeId != null ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _selectedVehicleTypeId != null
                          ? AppColors.primary.withOpacity(0.12)
                          : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.category_rounded,
                      size: 22,
                      color: _selectedVehicleTypeId != null
                          ? AppColors.primary
                          : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Vehicle Category (Auto-Detected)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          currentType?.name ?? 'Select vehicle model above',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: _selectedVehicleTypeId != null
                                ? AppColors.textPrimary
                                : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_selectedVehicleTypeId != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle_rounded, color: Color(0xFF15803D), size: 14),
                          SizedBox(width: 4),
                          Text(
                            'Matched',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF15803D),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Registration Plate Number Field
            TextFormField(
              controller: _regNumberController,
              textCapitalization: TextCapitalization.characters,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
              ),
              decoration: buildModernInputDecoration(
                labelText: 'Registration Plate Number',
                hintText: 'e.g. KA-01-AB-1234',
                prefixIcon: Icons.subtitles_outlined,
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Registration plate number is required';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            // 5. Year and Color Row
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedYear,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                    decoration: buildModernInputDecoration(
                      labelText: 'Year',
                      prefixIcon: Icons.calendar_today_outlined,
                    ),
                    items: _years
                        .map((y) => DropdownMenuItem(value: y, child: Text(y)))
                        .toList(),
                    onChanged: (val) {
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
                      fontWeight: FontWeight.w600,
                    ),
                    decoration: buildModernInputDecoration(
                      labelText: 'Color',
                      prefixIcon: Icons.palette_outlined,
                    ),
                    items: _colors
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (val) {
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
            const SizedBox(height: 36),

            // 6. Submit Button
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: isBusy ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 2,
                ),
                child: isBusy
                    ? const ThreeDotsLoader()
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Save & Continue',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(width: 8),
                          Icon(Icons.arrow_forward_rounded, size: 20),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
