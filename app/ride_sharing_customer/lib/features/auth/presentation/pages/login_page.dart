import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/region/region_guard.dart';
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

  // The country comes from the server-verified location (RegionGuard), never from the rider:
  // there is no picker, and the backend rejects numbers from any other country.
  RegionResult? _region;
  bool _isCheckingLocation = true;

  @override
  void initState() {
    super.initState();
    _resolveRegion();
  }

  Future<void> _resolveRegion() async {
    setState(() => _isCheckingLocation = true);
    final guard = sl<RegionGuard>();
    final current = guard.current;
    final result = (current != null && current.allowed) ? current : await guard.verify();
    if (!mounted) return;
    if (!result.allowed) {
      context.go('/region-unavailable', extra: result);
      return;
    }
    setState(() {
      _region = result;
      _isCheckingLocation = false;
    });
  }

  bool get _isCanada => _region?.countryCode == 'CA';

  String get _flag => (_region?.countryCode ?? 'IN').replaceAllMapped(
        RegExp(r'[A-Z]'),
        (m) => String.fromCharCode(m.group(0)!.codeUnitAt(0) + 127397),
      );

  String? _validatePhone(String? value) {
    final digits = (value ?? '').trim();
    if (digits.isEmpty) return 'Please enter your phone number';
    // if (_isCanada) {
    //   if (!RegExp(r'^[2-9]\d{2}[2-9]\d{6}$').hasMatch(digits)) return 'Enter a valid 10-digit Canadian number';
    // } else {
    //   if (!RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) return 'Enter a valid 10-digit Indian mobile number';
    // }
    return null;
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_region == null || !_formKey.currentState!.validate()) return;
    final phone = '${_region!.dialCode}${_phoneController.text.trim()}';
    context.read<AuthBloc>().add(LoginSubmitted(phone));
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
                                  // Locked dial code — from the verified location, not selectable
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 14.0),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(_flag, style: const TextStyle(fontSize: 18)),
                                        const SizedBox(width: 6),
                                        Text(
                                          _region?.dialCode ?? '',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF0A2540),
                                          ),
                                        ),
                                        // const SizedBox(width: 4),
                                        // const Icon(Icons.lock_outline_rounded, color: Color(0xFF94A3B8), size: 14),
                                      ],
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
                                      enabled: _region != null && !_isCheckingLocation,
                                      keyboardType: TextInputType.number,
                                      inputFormatters: [
                                        FilteringTextInputFormatter.digitsOnly,
                                        LengthLimitingTextInputFormatter(10),
                                      ],
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
                                      validator: _validatePhone,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (_region != null) ...[
                              // const SizedBox(height: 8),
                              // Padding(
                              //   padding: const EdgeInsets.only(left: 4),
                              //   child: Text(
                              //     'You are in ${_region!.countryName} — only ${_region!.countryName} (${_region!.dialCode}) numbers can be used here.',
                              //     style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                              //   ),
                              // ),
                            ],
                            const SizedBox(height: 20),
                            // Send OTP Button
                            SizedBox(
                              width: double.infinity,
                              height: 56,
                              child: ElevatedButton(
                                onPressed: (isLoading || _isCheckingLocation || _region == null) ? null : _submit,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF009048),
                                  disabledBackgroundColor: const Color(0xFF94A3B8),
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
