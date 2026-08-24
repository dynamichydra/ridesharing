import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geocoding/geocoding.dart' as geo;
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../injection_container.dart';
import '../bloc/auth_bloc.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  CountryConfig _selectedCountry = CountryConfig.supportedCountries.first;
  bool _isCheckingLocation = true;
  bool _hasLocationPermission = false;

  @override
  void initState() {
    super.initState();
    _checkLocationAndDetectCountry();
  }

  Future<void> _checkLocationAndDetectCountry() async {
    setState(() {
      _isCheckingLocation = true;
    });

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.deniedForever) {
        await openAppSettings();
        permission = await Geolocator.checkPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() {
          _isCheckingLocation = false;
          _hasLocationPermission = false;
        });
        return;
      }

      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        await Geolocator.openLocationSettings();
        serviceEnabled = await Geolocator.isLocationServiceEnabled();
        if (!serviceEnabled) {
          setState(() {
            _isCheckingLocation = false;
            _hasLocationPermission = false;
          });
          return;
        }
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      );

      final placemarks = await geo.Geocoding().placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      String isoCode = 'IN';
      if (placemarks.isNotEmpty && placemarks.first.isoCountryCode != null) {
        isoCode = placemarks.first.isoCountryCode!.toUpperCase();
      }

      final matched = CountryConfig.supportedCountries.firstWhere(
        (c) => c.isoCode == isoCode,
        orElse: () => isoCode == 'CA' || isoCode == 'US'
            ? CountryConfig.supportedCountries.firstWhere((c) => c.isoCode == 'CA')
            : CountryConfig.supportedCountries.firstWhere((c) => c.isoCode == 'IN'),
      );

      setState(() {
        _selectedCountry = matched;
        _hasLocationPermission = true;
        _isCheckingLocation = false;
      });
    } catch (e) {
      final permission = await Geolocator.checkPermission();
      final hasPerm = permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse;

      setState(() {
        _hasLocationPermission = hasPerm;
        _isCheckingLocation = false;
      });
    }
  }

  void _showCountryPickerBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext context) {
        String searchQuery = '';
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            final filteredCountries = CountryConfig.supportedCountries.where((c) {
              final query = searchQuery.toLowerCase();
              return c.name.toLowerCase().contains(query) ||
                  c.dialCode.contains(query) ||
                  c.isoCode.toLowerCase().contains(query);
            }).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.7,
              padding: const EdgeInsets.only(top: 16),
              child: Column(
                children: [
                  // Bottom Sheet Handle Bar
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Select Country / Region',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0A2540),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Search Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
                    child: TextField(
                      onChanged: (value) {
                        setModalState(() {
                          searchQuery = value;
                        });
                      },
                      decoration: InputDecoration(
                        hintText: 'Search country or code...',
                        prefixIcon: const Icon(Icons.search, color: Color(0xFF4A5568)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  // Full-width Country List
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: filteredCountries.length,
                      separatorBuilder: (context, index) => const Divider(
                        height: 1,
                        indent: 64,
                        endIndent: 20,
                        color: Color(0xFFF1F5F9),
                      ),
                      itemBuilder: (context, index) {
                        final country = filteredCountries[index];
                        final isSelected = country.isoCode == _selectedCountry.isoCode;
                        final flagEmoji = country.isoCode.toUpperCase().replaceAllMapped(
                              RegExp(r'[A-Z]'),
                              (match) => String.fromCharCode(
                                  match.group(0)!.codeUnitAt(0) + 127397),
                            );

                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 4,
                          ),
                          leading: Text(
                            flagEmoji,
                            style: const TextStyle(fontSize: 26),
                          ),
                          title: Text(
                            country.name,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                              color: isSelected ? const Color(0xFF009048) : const Color(0xFF0A2540),
                            ),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                country.dialCode,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: isSelected ? const Color(0xFF009048) : const Color(0xFF64748B),
                                ),
                              ),
                              if (isSelected) ...[
                                const SizedBox(width: 8),
                                const Icon(Icons.check_circle, color: Color(0xFF009048), size: 20),
                              ],
                            ],
                          ),
                          onTap: () {
                            setState(() {
                              _selectedCountry = country;
                            });
                            Navigator.pop(context);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final input = _phoneController.text.trim();
      String phone = input;
      if (!phone.startsWith('+')) {
        String digits = input.replaceAll(RegExp(r'\D'), '');
        if (digits.startsWith('0')) {
          digits = digits.substring(1);
        }
        phone = '${_selectedCountry.dialCode}$digits';
      }
      context.read<AuthBloc>().add(LoginSubmitted(phone));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      resizeToAvoidBottomInset: false,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is OtpRequired) {
            context.push('/otp', extra: state.phoneNumber);
          } else if (state is AuthAuthenticated) {
            context.go('/home');
          } else if (state is AuthError) {
            CustomToast.show(context, state.message);
          }
        },
        builder: (context, state) {
          final isLoading = state is AuthLoading;

          return Stack(
            children: [
              // Bottom decorative waves illustration
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Image.asset(
                  'assets/images/bottom-section-num-page.png',
                  fit: BoxFit.fitWidth,
                ),
              ),
              // Main content
              SafeArea(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 24),
                            // "Welcome to Ryva Ride" Header Section
                            const Text(
                              'Welcome to',
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0A2540),
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 7),
                            Image.asset(
                              'assets/images/ride-share-text-icon.png',
                              width: MediaQuery.of(context).size.width * 0.5,
                              fit: BoxFit.fitWidth,
                            ),
                            const SizedBox(height: 8),
                            // Small green line indicator
                            Container(
                              width: 36,
                              height: 4,
                              decoration: BoxDecoration(
                                color: const Color(0xFF009048),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Enter your mobile number\nto continue',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF4A5568),
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // const SizedBox(height: 32),
                      // City Car Illustration (Full Width, fixed spacing)
                      Image.asset(
                        'assets/images/car-section-main.png',
                        width: MediaQuery.of(context).size.width,
                        fit: BoxFit.fitWidth,
                      ),
                      const SizedBox(height: 32),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Phone Input Card
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: const Color(0xFFE2E8F0),
                                  width: 1.5,
                                ),
                              ),
                              child: Row(
                                children: [
                                   // Interactive Country Prefix Picker that opens a wide, full-name Bottom Sheet picker
                                   InkWell(
                                     onTap: _showCountryPickerBottomSheet,
                                     borderRadius: BorderRadius.circular(12),
                                     child: Padding(
                                       padding: const EdgeInsets.symmetric(
                                         horizontal: 14.0,
                                         vertical: 14.0,
                                       ),
                                       child: Row(
                                         mainAxisSize: MainAxisSize.min,
                                         children: [
                                           Text(
                                             _selectedCountry.isoCode.toUpperCase().replaceAllMapped(
                                                   RegExp(r'[A-Z]'),
                                                   (match) => String.fromCharCode(
                                                       match.group(0)!.codeUnitAt(0) + 127397),
                                                 ),
                                             style: const TextStyle(fontSize: 18),
                                           ),
                                           const SizedBox(width: 6),
                                           Text(
                                             _selectedCountry.dialCode,
                                             style: const TextStyle(
                                               fontSize: 16,
                                               fontWeight: FontWeight.bold,
                                               color: Color(0xFF0A2540),
                                             ),
                                           ),
                                           const SizedBox(width: 4),
                                           const Icon(
                                             Icons.arrow_drop_down,
                                             color: Color(0xFF4A5568),
                                             size: 20,
                                           ),
                                         ],
                                       ),
                                     ),
                                   ),
                                  // Vertical Divider
                                  Container(
                                    height: 24,
                                    width: 1,
                                    color: const Color(0xFFE2E8F0),
                                  ),
                                  // Text Input Field
                                  Expanded(
                                    child: TextFormField(
                                      controller: _phoneController,
                                      enabled: _hasLocationPermission && !_isCheckingLocation,
                                      keyboardType: TextInputType.phone,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        color: Color(0xFF0A2540),
                                      ),
                                      decoration: const InputDecoration(
                                        hintText: 'Enter mobile number',
                                        hintStyle: TextStyle(
                                          color: Color(0xFF94A3B8),
                                          fontSize: 16,
                                        ),
                                        contentPadding: EdgeInsets.symmetric(
                                          horizontal: 16,
                                        ),
                                        border: InputBorder.none,
                                        focusedBorder: InputBorder.none,
                                        enabledBorder: InputBorder.none,
                                        errorBorder: InputBorder.none,
                                        disabledBorder: InputBorder.none,
                                      ),
                                      validator: (value) {
                                        if (!_hasLocationPermission) {
                                          return 'Location permission required';
                                        }
                                        if (value == null ||
                                            value.trim().isEmpty) {
                                          return 'Please enter your phone number';
                                        }
                                        final trimmed = value.trim();
                                        if (trimmed.startsWith('+')) {
                                          final fullPhoneRegex = RegExp(r'^\+[1-9]\d{6,14}$');
                                          if (!fullPhoneRegex.hasMatch(trimmed)) {
                                            return 'Enter valid phone number in E.164 format';
                                          }
                                        } else {
                                          final localPhoneRegex = RegExp(r'^\d{7,12}$');
                                          if (!localPhoneRegex.hasMatch(trimmed)) {
                                            return 'Enter a valid mobile number (7 to 12 digits)';
                                          }
                                        }
                                        return null;
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                            // Send OTP Button
                            SizedBox(
                              width: double.infinity,
                              height: 56,
                              child: ElevatedButton(
                                onPressed: (isLoading || _isCheckingLocation || !_hasLocationPermission)
                                    ? (_hasLocationPermission ? null : _checkLocationAndDetectCountry)
                                    : _submit,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _hasLocationPermission
                                      ? const Color(0xFF009048)
                                      : const Color(0xFF94A3B8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  elevation: 0,
                                ),
                                child: _isCheckingLocation
                                    ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : !_hasLocationPermission
                                        ? const Text(
                                            'Allow Location to Continue',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          )
                                        : isLoading
                                            ? const SizedBox(
                                                width: 24,
                                                height: 24,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2.5,
                                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                                ),
                                              )
                                            : Stack(
                                                alignment: Alignment.center,
                                                children: const [
                                                  Align(
                                                    alignment: Alignment.center,
                                                    child: Text(
                                                      'Send OTP',
                                                      style: TextStyle(
                                                        fontSize: 16,
                                                        fontWeight: FontWeight.bold,
                                                        color: Colors.white,
                                                      ),
                                                    ),
                                                  ),
                                                  Align(
                                                    alignment: Alignment.centerRight,
                                                    child: Icon(
                                                      Icons.arrow_forward_rounded,
                                                      color: Colors.white,
                                                    ),
                                                  ),
                                                ],
                                              ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            // Security note
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(
                                  Icons.verified_user_rounded,
                                  color: Color(0xFF009048),
                                  size: 16,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  "We'll never share your number with anyone.",
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF4A5568),
                                    height: 1.3,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
