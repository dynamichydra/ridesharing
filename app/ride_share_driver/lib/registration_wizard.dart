import 'package:flutter/material.dart';
import 'style/appcolors.dart';
import 'api_service.dart';

class RegistrationWizard extends StatefulWidget {
  final VoidCallback onComplete;
  const RegistrationWizard({super.key, required this.onComplete});

  @override
  State<RegistrationWizard> createState() => _RegistrationWizardState();
}

class _RegistrationWizardState extends State<RegistrationWizard> {
  int _currentStep = 0; // 0: Welcome, 1: Phone, 2: OTP, 3: Email, 4: Terms, 5: Region, 6: Vehicle Pref, 7: Vehicle Form, 8: Checklist

  // Form input controllers
  final _phoneController = TextEditingController(text: '9876543211');
  final _otpController = TextEditingController(text: '123456');
  final _emailController = TextEditingController(text: 'arijit.bose.sit@gmail.com');
  
  final _licenseController = TextEditingController();
  final _sinController = TextEditingController();
  final _bankAccountController = TextEditingController();
  final _emergencyNameController = TextEditingController();

  // Region selections
  String _selectedCountry = 'India';
  String _selectedState = 'Karnataka';
  String _selectedCity = 'Bengaluru';

  // Vehicle states
  String _selectedYear = '2022';
  String _selectedMake = 'Toyota';
  String _selectedModel = 'Prius';
  String _selectedColor = 'Silver';
  String _selectedDoors = '4';
  String _selectedSeatbelts = '5';
  bool _wheelchairRamp = false;

  // Checklist items progress states (9 items)
  bool _carDetailsDone = false;
  bool _sinDone = false;
  bool _licenseDone = false;
  bool _photoDone = false;
  bool _bgCheckDone = false;
  bool _proofOfWorkDone = false;
  bool _vehicleInspectionDone = false;
  bool _directDepositDone = false;
  bool _emergencyContactDone = false;

  void _nextStep() {
    setState(() {
      _currentStep++;
    });
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    }
  }

  int _getCompletedCount() {
    int count = 0;
    if (_carDetailsDone) count++;
    if (_sinDone) count++;
    if (_licenseDone) count++;
    if (_photoDone) count++;
    if (_bgCheckDone) count++;
    if (_proofOfWorkDone) count++;
    if (_vehicleInspectionDone) count++;
    if (_directDepositDone) count++;
    if (_emergencyContactDone) count++;
    return count;
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (_currentStep > 0) {
          _prevStep();
          return false;
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: _currentStep > 0
            ? AppBar(
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                  onPressed: _prevStep,
                ),
                title: Text(
                  'Step $_currentStep of 8',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                ),
                backgroundColor: Colors.white,
                elevation: 0,
                centerTitle: true,
              )
            : null,
        body: SafeArea(
          child: Column(
            children: [
              // Progress bar
              if (_currentStep > 0)
                LinearProgressIndicator(
                  value: _currentStep / 8.0,
                  color: AppColors.primary,
                  backgroundColor: AppColors.border,
                  minHeight: 3,
                ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: _buildStepContent(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildWelcomeScreen();
      case 1:
        return _buildPhoneScreen();
      case 2:
        return _buildOtpScreen();
      case 3:
        return _buildEmailScreen();
      case 4:
        return _buildTermsScreen();
      case 5:
        return _buildRegionScreen();
      case 6:
        return _buildVehiclePreferenceScreen();
      case 7:
        return _buildVehicleFormScreen();
      case 8:
        return _buildChecklistScreen();
      default:
        return _buildWelcomeScreen();
    }
  }

  // ==========================================
  // Step 0: Welcome / Landing Page
  // ==========================================
  Widget _buildWelcomeScreen() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          flex: 6,
          child: Container(
            color: AppColors.surface,
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.local_taxi_rounded, size: 100, color: AppColors.primary),
                  SizedBox(height: 16),
                  Text(
                    'lyft',
                    style: TextStyle(
                      fontSize: 60,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      letterSpacing: -2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Expanded(
          flex: 4,
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Earn good money, meet great people',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
                const Spacer(),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 54),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  onPressed: _nextStep,
                  child: const Text(
                    'Get started',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () {},
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Ready to ride? Open the rider app.',
                        style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.w600),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_rounded, color: AppColors.secondary, size: 16),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // Step 1: Phone Entry Screen
  // ==========================================
  Widget _buildPhoneScreen() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Enter your mobile number',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'We will send a 6-digit verification code to confirm your device.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 15),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text('+91', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    focusedBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: AppColors.primary, width: 2.0),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
            onPressed: () async {
              if (_phoneController.text.isNotEmpty) {
                await ApiService.startPhoneAuth('+91${_phoneController.text}', 'device-id-mock-123');
                _nextStep();
              }
            },
            child: const Text(
              'Next',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Step 2: OTP Verification Screen
  // ==========================================
  Widget _buildOtpScreen() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Verify code',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            'We sent a code to +91 ${_phoneController.text}. Enter it below.',
            style: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          TextField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 8),
            decoration: InputDecoration(
              labelText: '6-Digit Verification Code',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: AppColors.primary, width: 2.0),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {},
            child: const Text('Resend Code', style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold)),
          ),
          const Spacer(),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
            onPressed: () async {
              if (_otpController.text.length >= 4) {
                await ApiService.verifyPhoneOtp('+91${_phoneController.text}', _otpController.text, 'device-id-mock-123');
                _nextStep();
              }
            },
            child: const Text(
              'Verify & Continue',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Step 3: Email Screen
  // ==========================================
  Widget _buildEmailScreen() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Great to meet you.\nMind sharing your email?',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Ride receipts and account updates need to get sent somewhere.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: 'Email',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: AppColors.primary, width: 2.0),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const Spacer(),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
            onPressed: () async {
              if (_emailController.text.isNotEmpty) {
                await ApiService.updateProfile(
                  name: 'Arijit Bose',
                  email: _emailController.text,
                );
                _nextStep();
              }
            },
            child: const Text(
              'Next',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Step 4: Terms Agreement Screen
  // ==========================================
  Widget _buildTermsScreen() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          color: AppColors.surface,
          child: const Text(
            'Before you can proceed you must read and agree to Lyft\'s Terms of Service',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary),
            textAlign: TextAlign.center,
          ),
        ),
        const Expanded(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '1. The Lyft Platform',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                SizedBox(height: 8),
                Text(
                  'The Lyft Platform provides a marketplace where, among other things, persons who seek transportation to certain destinations ("Riders") can be matched with transportation options to such destinations. One option for Riders is to request a ride from rideshare drivers who are driving to or through those destinations ("Drivers"). Drivers, Riders, and any other individuals using the Lyft Platform are collectively referred to herein as "Users."',
                  style: TextStyle(fontSize: 14, height: 1.4, color: AppColors.textSecondary),
                ),
                SizedBox(height: 24),
                Text(
                  '11. Intellectual Property',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                SizedBox(height: 8),
                Text(
                  'All intellectual property rights in and to the Lyft Platform shall be owned by Lyft absolutely and in their entirety. These rights include database rights, inventions and patentable subject-matter, patents, copyright, design rights (whether registered or unregistered), trademarks, and other similar rights wherever existing in the world together with the right to apply for protection of the same.',
                  style: TextStyle(fontSize: 14, height: 1.4, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
            onPressed: _nextStep,
            child: const Text(
              'I agree',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // Step 5: Region Selection Screen
  // ==========================================
  Widget _buildRegionScreen() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Where would you like to drive?',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Select your primary country, state, and city limits.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          _buildDropdown('Country', _selectedCountry, ['India', 'Canada', 'USA'], (val) {
            setState(() { _selectedCountry = val!; });
          }),
          const SizedBox(height: 16),
          _buildDropdown('State', _selectedState, ['Karnataka', 'Maharashtra', 'Delhi'], (val) {
            setState(() { _selectedState = val!; });
          }),
          const SizedBox(height: 16),
          _buildDropdown('City', _selectedCity, ['Bengaluru', 'Mumbai', 'New Delhi'], (val) {
            setState(() { _selectedCity = val!; });
          }),
          const Spacer(),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
            onPressed: () async {
              await ApiService.setDrivingLocation(
                countryId: 'in',
                stateId: 'ka',
                cityId: 'blr',
              );
              _nextStep();
            },
            child: const Text(
              'Continue',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Step 6: Vehicle Preference Selection Screen
  // ==========================================
  Widget _buildVehiclePreferenceScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Vehicle Preference',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 24),
          Card(
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.border),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  Icon(Icons.drive_eta_rounded, color: AppColors.primary, size: 60),
                  const SizedBox(height: 12),
                  const Text(
                    'I have a vehicle',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Heads up: Your vehicle must be 2019 or newer and have a minimum of 4 doors and 5 seatbelts.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                    onPressed: _nextStep,
                    child: const Text('Add your vehicle'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.border),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  Icon(Icons.car_rental_rounded, color: AppColors.secondary, size: 60),
                  const SizedBox(height: 12),
                  const Text(
                    'I need a car',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Standard maintenance, insurance, and roadside assistance included. Express Drive isn\'t renting in your area yet, but we can notify you.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.secondary,
                      side: const BorderSide(color: AppColors.secondary),
                      minimumSize: const Size(double.infinity, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                    onPressed: () {
                      setState(() {
                        _currentStep = 8; // Skip directly to Checklist
                        _carDetailsDone = false;
                      });
                    },
                    child: const Text('Get notified'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Step 7: Personal Vehicle Form Screen
  // ==========================================
  Widget _buildVehicleFormScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Add Personal Vehicle',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 24),
          _buildDropdown('Year', _selectedYear, ['2025', '2024', '2023', '2022', '2021', '2020', '2019'], (val) {
            setState(() { _selectedYear = val!; });
          }),
          const SizedBox(height: 16),
          _buildDropdown('Make', _selectedMake, ['Toyota', 'Honda', 'Hyundai', 'Ford', 'Chevrolet'], (val) {
            setState(() { _selectedMake = val!; });
          }),
          const SizedBox(height: 16),
          _buildDropdown('Model', _selectedModel, ['Prius', 'Camry', 'Civic', 'Elantra', 'Focus'], (val) {
            setState(() { _selectedModel = val!; });
          }),
          const SizedBox(height: 16),
          _buildDropdown('Colour', _selectedColor, ['Silver', 'Black', 'White', 'Blue', 'Red'], (val) {
            setState(() { _selectedColor = val!; });
          }),
          const SizedBox(height: 16),
          _buildDropdown('Doors', _selectedDoors, ['4', '5'], (val) {
            setState(() { _selectedDoors = val!; });
          }),
          const SizedBox(height: 16),
          _buildDropdown('Seatbelts', _selectedSeatbelts, ['5', '6', '7'], (val) {
            setState(() { _selectedSeatbelts = val!; });
          }),
          const SizedBox(height: 16),
          CheckboxListTile(
            title: const Text('Vehicle has a wheelchair accessible ramp', style: TextStyle(fontSize: 14, color: AppColors.textPrimary)),
            value: _wheelchairRamp,
            activeColor: AppColors.primary,
            onChanged: (val) {
              setState(() { _wheelchairRamp = val!; });
            },
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
            onPressed: () async {
              await ApiService.addVehicle(
                vehicleTypeId: 'sedan',
                model: '$_selectedMake $_selectedModel',
                year: _selectedYear,
                registrationNumber: 'KA-01-LYFT-1234',
                color: _selectedColor,
              );
              setState(() {
                _carDetailsDone = true;
                _currentStep = 8; // Go to Checklist
              });
            },
            child: const Text(
              'Continue',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown(String label, String value, List<String> items, ValueChanged<String?> onChanged) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        focusedBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: AppColors.primary, width: 2.0),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      items: items.map((item) {
        return DropdownMenuItem(value: item, child: Text(item));
      }).toList(),
      onChanged: onChanged,
    );
  }

  // ==========================================
  // Step 8: Checklist / To-Do Screen (Lyft 9 Onboarding items)
  // ==========================================
  Widget _buildChecklistScreen() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: Row(
            children: [
              const Text(
                'To-do',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  '${_getCompletedCount()} / 9 items',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            children: [
              _buildChecklistItem(
                icon: Icons.directions_car_rounded,
                title: 'Car details',
                subtitle: _carDetailsDone
                    ? 'Completed: $_selectedColor $_selectedYear $_selectedMake $_selectedModel'
                    : 'We need the colour, year, make, and model',
                isDone: _carDetailsDone,
                onTap: () {
                  setState(() { _currentStep = 6; });
                },
              ),
              _buildChecklistItem(
                icon: Icons.account_balance_rounded,
                title: 'Social Insurance Number',
                subtitle: _sinDone ? 'SIN details saved' : 'This allows us to pay you and comply with tax laws',
                isDone: _sinDone,
                onTap: () {
                  _showInputDialog('Social Insurance Number', 'Enter 9-digit SIN', _sinController, () {
                    if (_sinController.text.length >= 9) {
                      setState(() { _sinDone = true; });
                    }
                  });
                },
              ),
              _buildChecklistItem(
                icon: Icons.badge_rounded,
                title: 'Driver\'s licence',
                subtitle: _licenseDone ? 'License recorded' : 'Confirm your identity and driving status',
                isDone: _licenseDone,
                onTap: () {
                  _showInputDialog('Driver\'s licence', 'Enter driving license number', _licenseController, () {
                    if (_licenseController.text.isNotEmpty) {
                      setState(() { _licenseDone = true; });
                    }
                  });
                },
              ),
              _buildChecklistItem(
                icon: Icons.camera_alt_rounded,
                title: 'Profile photo',
                subtitle: _photoDone ? 'Photo uploaded' : 'Make it easy for riders to find you',
                isDone: _photoDone,
                onTap: () {
                  setState(() { _photoDone = true; });
                },
              ),
              _buildChecklistItem(
                icon: Icons.description_rounded,
                title: 'Background check consent',
                subtitle: _bgCheckDone ? 'Consent accepted' : 'Your authorization is needed to complete reference checks',
                isDone: _bgCheckDone,
                onTap: () {
                  setState(() { _bgCheckDone = true; });
                },
              ),
              _buildChecklistItem(
                icon: Icons.verified_user_rounded,
                title: 'Proof of work eligibility',
                subtitle: _proofOfWorkDone ? 'Work eligibility confirmed' : 'Work permit, PR, Passport, or Birth Certificate',
                isDone: _proofOfWorkDone,
                onTap: () {
                  setState(() { _proofOfWorkDone = true; });
                },
              ),
              _buildChecklistItem(
                icon: Icons.build_rounded,
                title: 'Vehicle inspection',
                subtitle: _vehicleInspectionDone ? 'Inspection certificate verified' : 'Submit safety certificate documents',
                isDone: _vehicleInspectionDone,
                onTap: () {
                  setState(() { _vehicleInspectionDone = true; });
                },
              ),
              _buildChecklistItem(
                icon: Icons.payment_rounded,
                title: 'Direct deposit info',
                subtitle: _directDepositDone ? 'Direct deposit bank configured' : 'Add account/routing digits for payouts',
                isDone: _directDepositDone,
                onTap: () {
                  _showInputDialog('Direct Deposit Details', 'Enter bank account number', _bankAccountController, () {
                    if (_bankAccountController.text.isNotEmpty) {
                      setState(() { _directDepositDone = true; });
                    }
                  });
                },
              ),
              _buildChecklistItem(
                icon: Icons.contact_phone_rounded,
                title: 'Emergency contact',
                subtitle: _emergencyContactDone ? 'Contact detail set' : 'Add emergency companion telephone digits',
                isDone: _emergencyContactDone,
                onTap: () {
                  _showInputDialog('Emergency Contact', 'Enter contact name/number', _emergencyNameController, () {
                    if (_emergencyNameController.text.isNotEmpty) {
                      setState(() { _emergencyContactDone = true; });
                    }
                  });
                },
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
            onPressed: () async {
              if (_getCompletedCount() >= 9) {
                await ApiService.submitApplication();
                widget.onComplete();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please complete all 9 To-do items before submitting.')),
                );
              }
            },
            child: const Text(
              'Submit Application',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChecklistItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isDone,
    required VoidCallback onTap,
  }) {
    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        leading: CircleAvatar(
          backgroundColor: isDone ? AppColors.primary.withOpacity(0.1) : AppColors.surface,
          child: Icon(icon, color: isDone ? AppColors.primary : AppColors.textSecondary),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        trailing: Icon(
          isDone ? Icons.check_circle_rounded : Icons.chevron_right_rounded,
          color: isDone ? AppColors.primary : AppColors.border,
        ),
        onTap: onTap,
      ),
    );
  }

  void _showInputDialog(String title, String hint, TextEditingController controller, VoidCallback onSave) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(title),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(hintText: hint),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () {
                onSave();
                Navigator.pop(context);
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }
}
