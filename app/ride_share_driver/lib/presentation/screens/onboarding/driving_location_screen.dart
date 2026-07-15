import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/geo.dart';

class DrivingLocationScreen extends StatefulWidget {
  final List<Country> countries;
  final String? initialCountryId;
  final String? initialStateId;
  final String? initialCityId;
  final Future<List<StateProvince>> Function(String) getStates;
  final Future<List<City>> Function(String) getCities;
  final Function({
    required String countryId,
    required String stateId,
    required String cityId,
  })
  onSave;

  const DrivingLocationScreen({
    super.key,
    required this.countries,
    this.initialCountryId,
    this.initialStateId,
    this.initialCityId,
    required this.getStates,
    required this.getCities,
    required this.onSave,
  });

  @override
  State<DrivingLocationScreen> createState() => _DrivingLocationScreenState();
}

class _DrivingLocationScreenState extends State<DrivingLocationScreen> {
  String? _selectedCountryId;
  String? _selectedStateId;
  String? _selectedCityId;

  List<StateProvince> _states = [];
  List<City> _cities = [];

  bool _loadingStates = false;
  bool _loadingCities = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialCountryId != null) {
      _selectedCountryId = widget.initialCountryId;
      _loadStatesAndCities(
        widget.initialCountryId!,
        widget.initialStateId,
        widget.initialCityId,
      );
    } else {
      final india = widget.countries.firstWhere(
        (c) => c.isoCode == 'IN' || c.name.toLowerCase() == 'india',
        orElse: () => widget.countries.isNotEmpty
            ? widget.countries.first
            : Country(
                id: '',
                name: '',
                isoCode: '',
                dialCode: '',
                currencyCode: '',
              ),
      );
      if (india.id.isNotEmpty) {
        _selectedCountryId = india.id;
        _loadStates(india.id);
      }
    }
  }

  Future<void> _loadStatesAndCities(
    String countryId,
    String? stateId,
    String? cityId,
  ) async {
    setState(() {
      _loadingStates = true;
    });
    try {
      final states = await widget.getStates(countryId);
      setState(() {
        _states = states;
        _selectedStateId = stateId;
      });
      if (stateId != null) {
        setState(() {
          _loadingCities = true;
        });
        final cities = await widget.getCities(stateId);
        setState(() {
          _cities = cities;
          _selectedCityId = cityId;
        });
      }
    } catch (_) {}
    setState(() {
      _loadingStates = false;
      _loadingCities = false;
    });
  }

  Future<void> _loadStates(String countryId) async {
    setState(() {
      _loadingStates = true;
      _states = [];
      _cities = [];
      _selectedStateId = null;
      _selectedCityId = null;
    });
    try {
      final states = await widget.getStates(countryId);
      setState(() {
        _states = states;
      });
    } catch (_) {}
    setState(() {
      _loadingStates = false;
    });
  }

  Future<void> _loadCities(String stateId) async {
    setState(() {
      _loadingCities = true;
      _cities = [];
      _selectedCityId = null;
    });
    try {
      final cities = await widget.getCities(stateId);
      setState(() {
        _cities = cities;
      });
    } catch (_) {}
    setState(() {
      _loadingCities = false;
    });
  }

  void _submit() {
    if (_selectedCountryId != null &&
        _selectedStateId != null &&
        _selectedCityId != null) {
      widget.onSave(
        countryId: _selectedCountryId!,
        stateId: _selectedStateId!,
        cityId: _selectedCityId!,
      );
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
      );
    }

    final isFormValid = _selectedCountryId != null &&
        _selectedStateId != null &&
        _selectedCityId != null;

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Where would you drive?',
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
            'Select your region. Region determines your local fares, documents, and rules.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),

          // Country Selection Dropdown
          DropdownButtonFormField<String>(
            value: _selectedCountryId,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'Country',
              prefixIcon: Icons.flag_outlined,
            ),
            items: widget.countries
                .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                .toList(),
            onChanged: (val) {
              debugPrint('[DrivingLocationScreen] Country changed: $val');
              if (val != null) {
                setState(() {
                  _selectedCountryId = val;
                });
                _loadStates(val);
              }
            },
          ),
          const SizedBox(height: 20),

          // State Selection Dropdown
          DropdownButtonFormField<String>(
            value: _selectedStateId,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'State / Province',
              prefixIcon: Icons.map_outlined,
              suffixIcon: _loadingStates
                  ? const UnconstrainedBox(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                    )
                  : null,
            ),
            items: _states
                .map((s) => DropdownMenuItem(value: s.id, child: Text(s.name)))
                .toList(),
            onChanged: (val) {
              debugPrint('[DrivingLocationScreen] State changed: $val');
              if (val != null) {
                setState(() {
                  _selectedStateId = val;
                });
                _loadCities(val);
              }
            },
          ),
          const SizedBox(height: 20),

          // City Selection Dropdown
          DropdownButtonFormField<String>(
            value: _selectedCityId,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
            decoration: buildModernInputDecoration(
              labelText: 'City Limit',
              prefixIcon: Icons.location_city_outlined,
              suffixIcon: _loadingCities
                  ? const UnconstrainedBox(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                    )
                  : null,
            ),
            items: _cities
                .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                .toList(),
            onChanged: (val) {
              debugPrint('[DrivingLocationScreen] City changed: $val');
              setState(() {
                _selectedCityId = val;
              });
            },
          ),
          const Spacer(),

          // Submit Button
          AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: isFormValid ? 1.0 : 0.6,
            child: Container(
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppColors.primary,
                boxShadow: isFormValid
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: ElevatedButton(
                onPressed: isFormValid
                    ? () {
                        debugPrint(
                          '[DrivingLocationScreen] Save location clicked. Country: $_selectedCountryId, State: $_selectedStateId, City: $_selectedCityId',
                        );
                        _submit();
                      }
                    : null,
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
                      'Save location',
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
          ),
        ],
      ),
    );
  }
}
