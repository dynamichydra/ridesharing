import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/geo.dart';

class DrivingLocationScreen extends StatefulWidget {
  final List<Country> countries;
  final Future<List<StateProvince>> Function(String) getStates;
  final Future<List<City>> Function(String) getCities;
  final Function({required String countryId, required String stateId, required String cityId}) onSave;

  const DrivingLocationScreen({
    super.key,
    required this.countries,
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
    // Default country to India if available in config
    final india = widget.countries.firstWhere(
      (c) => c.isoCode == 'IN' || c.name.toLowerCase() == 'india',
      orElse: () => widget.countries.isNotEmpty ? widget.countries.first : Country(id: '', name: '', isoCode: '', dialCode: '', currencyCode: ''),
    );
    if (india.id.isNotEmpty) {
      _selectedCountryId = india.id;
      _loadStates(india.id);
    }
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
    if (_selectedCountryId != null && _selectedStateId != null && _selectedCityId != null) {
      widget.onSave(
        countryId: _selectedCountryId!,
        stateId: _selectedStateId!,
        cityId: _selectedCityId!,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Where would you drive?',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Select your region. Region determines your local fares, documents, and rules.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 40),
          DropdownButtonFormField<String>(
            value: _selectedCountryId,
            decoration: const InputDecoration(labelText: 'Country'),
            items: widget.countries.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
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
          DropdownButtonFormField<String>(
            value: _selectedStateId,
            decoration: InputDecoration(
              labelText: 'State / Province',
              suffixIcon: _loadingStates ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : null,
            ),
            items: _states.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
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
          DropdownButtonFormField<String>(
            value: _selectedCityId,
            decoration: InputDecoration(
              labelText: 'City limit',
              suffixIcon: _loadingCities ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : null,
            ),
            items: _cities.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
            onChanged: (val) {
              debugPrint('[DrivingLocationScreen] City changed: $val');
              setState(() {
                _selectedCityId = val;
              });
            },
          ),
          const Spacer(),
          ElevatedButton(
            onPressed: (_selectedCountryId != null && _selectedStateId != null && _selectedCityId != null) 
              ? () {
                  debugPrint('[DrivingLocationScreen] Save location clicked. Country: $_selectedCountryId, State: $_selectedStateId, City: $_selectedCityId');
                  _submit();
                }
              : null,
            child: const Text('Save location'),
          ),
        ],
      ),
    );
  }
}
