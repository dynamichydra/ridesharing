import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../style/appcolors.dart';
import '../../../domain/repositories/onboarding_repository.dart';
import '../../../injection_container.dart';
import '../../bloc/onboarding/onboarding_bloc.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../../core/localization/app_localizations.dart';

// Screens
import 'welcome_screen.dart';
import '../auth/phone_auth_screen.dart';
import '../auth/otp_verification_screen.dart';
import 'personal_info_screen.dart';
import 'terms_legal_screen.dart';
import 'driving_location_screen.dart';
import 'vehicle_selection_screen.dart';
import 'vehicle_form_screen.dart';
import 'checklist_screen.dart';
import 'document_upload_screen.dart';
import '../../widgets/custom_toast.dart';
import 'profile_photo_screen.dart';
import 'bank_details_screen.dart';
import 'emergency_contact_screen.dart';

class OnboardingWizard extends StatefulWidget {
  final VoidCallback onComplete;

  const OnboardingWizard({super.key, required this.onComplete});

  @override
  State<OnboardingWizard> createState() => _OnboardingWizardState();
}

class _OnboardingWizardState extends State<OnboardingWizard> {
  int _currentStep = 0; 
  // 0: Welcome, 1: Phone, 2: OTP, 3: PersonalInfo, 4: Terms, 5: Location, 6: VehiclePref, 7: VehicleForm, 8: Checklist
  // Sub-flows: 9: Document DL, 10: Document Aadhar, 11: Questionnaire, 12: ProfilePhoto, 13: BankDetails, 14: EmergencyContact

  String _phoneNumber = '';
  bool _isLogin = false;
  OnboardingConfig? _config;
  RegistrationSummary? _summary;

  // Track simulated checklist items completed but not saved in DB
  final Set<String> _simulatedCompletedItems = {};

  void _nextStep() {
    setState(() {
      _currentStep++;
    });
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        if (_currentStep >= 9) {
          _currentStep = 8; // Go back to checklist from subflows
        } else {
          _currentStep--;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return WillPopScope(
      onWillPop: () async {
        if (_currentStep > 0) {
          _prevStep();
          return false;
        }
        return true;
      },
      child: BlocListener<AuthBloc, AuthState>(
        listener: (context, authState) {
          if (authState is Authenticated) {
            debugPrint('[OnboardingWizard] AuthState transitioned to Authenticated. Fetching configuration.');
            context.read<OnboardingBloc>().add(LoadOnboardingConfig());
            if (_currentStep == 2) {
              _nextStep();
            }
          } else if (authState is AuthOtpSent) {
            debugPrint('[OnboardingWizard] AuthState: AuthOtpSent. Moving to OTP Verification screen.');
            if (_currentStep == 1) {
              _nextStep();
            }
          } else if (authState is AuthError) {
            debugPrint('[OnboardingWizard] AuthState: AuthError: ${authState.message}');
            CustomToast.show(context, authState.message);
          }
        },
        child: BlocConsumer<OnboardingBloc, OnboardingState>(
          listener: (context, state) {
            if (state is OnboardingConfigLoaded) {
              setState(() {
                _config = state.config;
              });
              context.read<OnboardingBloc>().add(LoadRegistrationSummary());
            } else if (state is RegistrationSummaryLoaded) {
              setState(() {
                // Merge simulated checklist status values
                final missing = List<String>.from(state.summary.missing);
                for (final sim in _simulatedCompletedItems) {
                  missing.remove(sim);
                }
                
                _summary = RegistrationSummary(
                  driver: state.summary.driver,
                  vehicles: state.summary.vehicles,
                  documents: state.summary.documents,
                  answers: state.summary.answers,
                  isComplete: missing.isEmpty,
                  missing: missing,
                );

                // For newly registered drivers or partially registered returning drivers:
                // If they are currently at the OTP screen (index 2) but the config has finished loading,
                // we route them to their actual registration step (e.g., Step 3 for Personal Info).
                if (_currentStep == 2) {
                  final step = state.summary.driver.registrationStep;
                  if (step >= 1 && step < 8) {
                    _currentStep = step + 2; // Map DB step to local UI step: step 1 (personal info) => case 3
                  } else if (step >= 8) {
                    _currentStep = 8; // Checklist
                  }
                }
              });
            } else if (state is OnboardingSuccess) {
              context.read<OnboardingBloc>().add(LoadRegistrationSummary());
              setState(() {
                if (_currentStep >= 3 && _currentStep < 8) {
                  _nextStep();
                } else {
                  _currentStep = 8; // Back to checklist from subflows
                }
              });
            } else if (state is ApplicationSubmitted) {
              widget.onComplete();
            } else if (state is OnboardingError) {
              CustomToast.show(context, state.message);
            }
          },
        builder: (context, state) {
          return Scaffold(
            backgroundColor: Colors.white,
              appBar: _currentStep > 0
                  ? AppBar(
                      leading: IconButton(
                        icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                        onPressed: _prevStep,
                      ),
                      title: Text(
                        _currentStep >= 8
                            ? l10n.verificationSteps
                            : (_currentStep >= 3
                                ? l10n.stepNOf8(_currentStep - 2)
                                : ''),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                      ),
                    )
                  : null,
              body: SafeArea(
                top: _currentStep > 0,
                bottom: _currentStep > 0,
                child: Column(
                  children: [
                    if (_currentStep >= 3 && _currentStep < 8)
                      LinearProgressIndicator(
                        value: (_currentStep - 2) / 6.0,
                        color: AppColors.primary,
                        backgroundColor: AppColors.border,
                        minHeight: 3,
                      ),
                    if (state is OnboardingLoading)
                      const LinearProgressIndicator(minHeight: 3, color: AppColors.secondary),
                    Expanded(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        child: _buildStepContent(context),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildStepContent(BuildContext context) {
    switch (_currentStep) {
      case 0:
        return WelcomeScreen(
          onRegister: () {
            setState(() {
              _isLogin = false;
              _currentStep = 1;
            });
          },
          onLogin: () {
            setState(() {
              _isLogin = true;
              _currentStep = 1;
            });
          },
        );
      case 1:
        return PhoneAuthScreen(
          isLogin: _isLogin,
          onPhoneSubmitted: (phone) {
            _phoneNumber = phone;
            context.read<AuthBloc>().add(
              StartPhoneAuthentication(phone: phone, deviceId: 'driver_emulator', isLogin: _isLogin),
            );
          },
        );
      case 2:
        return OtpVerificationScreen(
          phoneNumber: _phoneNumber,
          onOtpVerified: (otp) {
            // Dispatch actual verification event to AuthBloc
            context.read<AuthBloc>().add(
              VerifyOtpCode(phone: _phoneNumber, otp: otp, deviceId: 'driver_emulator', isLogin: _isLogin),
            );
            // OnboardingBloc will trigger loading config when Authenticated state is received
          },
          onResendRequested: () {
            context.read<AuthBloc>().add(
              StartPhoneAuthentication(phone: _phoneNumber, deviceId: 'driver_emulator', isLogin: _isLogin),
            );
          },
        );
      case 3:
        return PersonalInfoScreen(
          onSave: ({required String name, required String email, String? dob, String? gender, String? referralCode}) {
            context.read<OnboardingBloc>().add(
              UpdatePersonalInfo(name: name, email: email, dob: dob, gender: gender, referralCode: referralCode),
            );
          },
        );
      case 4:
        return TermsLegalScreen(
          termsContent: '',
          onAccepted: () {
            if (_config?.termsId != null && _config?.privacyPolicyId != null) {
              context.read<OnboardingBloc>().add(
                AcceptTermsAndPrivacy(termsId: _config!.termsId!, privacyId: _config!.privacyPolicyId!),
              );
            } else {
              _nextStep();
            }
          },
        );
      case 5:
        if (_config == null) {
          return const Center(child: CircularProgressIndicator());
        }
        return DrivingLocationScreen(
          countries: _config!.countries,
          getStates: (countryId) => sl<OnboardingRepository>().getStates(countryId),
          getCities: (stateId) => sl<OnboardingRepository>().getCities(stateId),
          onSave: ({required countryId, required stateId, required cityId}) {
            context.read<OnboardingBloc>().add(
              SelectDrivingRegion(countryId: countryId, stateId: stateId, cityId: cityId),
            );
          },
        );
      case 6:
        return VehicleSelectionScreen(
          onHasVehicle: _nextStep,
          onNeedVehicle: () {
            setState(() {
              _currentStep = 8; // Skip directly to Checklist
            });
          },
        );
      case 7:
        if (_config == null) {
          return const Center(child: CircularProgressIndicator());
        }
        return VehicleFormScreen(
          vehicleTypes: _config!.vehicleTypes,
          onSave: ({color, required model, required registrationNumber, required vehicleTypeId, required year}) {
            context.read<OnboardingBloc>().add(
              AddVehicleDetails(vehicleTypeId: vehicleTypeId, model: model, year: year, registrationNumber: registrationNumber, color: color),
            );
          },
        );
      case 8:
        if (_summary == null) {
          return const Center(child: CircularProgressIndicator());
        }
        return ChecklistScreen(
          summary: _summary!,
          onItemTap: (code) {
            setState(() {
              if (code == 'personal_info') {
                _currentStep = 3;
              } else if (code == 'drivingLocation') {
                _currentStep = 5;
              } else if (code == 'legalAcceptance') {
                _currentStep = 4;
              } else if (code == 'vehicle') {
                _currentStep = 7;
              } else if (code == 'document:DRIVERS_LICENSE') {
                _currentStep = 9;
              } else if (code == 'document:NATIONAL_ID') {
                _currentStep = 10;
              } else if (code == 'profile_photo') {
                _currentStep = 12;
              } else if (code == 'bank_details') {
                _currentStep = 13;
              } else if (code == 'emergency_contact') {
                _currentStep = 14;
              }
            });
          },
          onSubmit: () {
            context.read<OnboardingBloc>().add(SubmitOnboardingApplication());
          },
        );
      case 9:
      case 10:
        // DL & Aadhar upload subflow
        final docCode = _currentStep == 9 ? 'DRIVERS_LICENSE' : 'NATIONAL_ID';
        if (_config == null) return const Center(child: CircularProgressIndicator());
        
        final docType = _config!.documentRequirements.firstWhere((d) => d.code == docCode);
        final existing = _summary?.documents.firstWhere((d) => d.documentTypeId == docType.id);

        return DocumentUploadScreen(
          docType: docType,
          existingDoc: existing,
          onUpload: ({required bytes, required contentType, required docNumber, expiryDate, required side}) {
            context.read<OnboardingBloc>().add(
              UploadDocumentFileEvent(
                documentTypeId: docType.id,
                side: side,
                docNumber: docNumber,
                expiryDate: expiryDate,
                bytes: bytes,
                contentType: contentType,
              ),
            );
          },
        );
      case 12:
        return ProfilePhotoScreen(
          currentPhotoUrl: _summary?.driver.profilePhoto,
          onUpload: ({required bytes, required contentType}) {
            context.read<OnboardingBloc>().add(
              UploadProfilePhotoEvent(bytes: bytes, contentType: contentType),
            );
          },
        );
      case 13:
        return BankDetailsScreen(
          onComplete: () {
            setState(() {
              _simulatedCompletedItems.add('bank_details');
              _currentStep = 8;
            });
            context.read<OnboardingBloc>().add(LoadRegistrationSummary());
          },
        );
      case 14:
        return EmergencyContactScreen(
          onComplete: () {
            setState(() {
              _simulatedCompletedItems.add('emergency_contact');
              _currentStep = 8;
            });
            context.read<OnboardingBloc>().add(LoadRegistrationSummary());
          },
        );
      default:
        return WelcomeScreen(
          onRegister: () {
            setState(() {
              _isLogin = false;
              _currentStep = 1;
            });
          },
          onLogin: () {
            setState(() {
              _isLogin = true;
              _currentStep = 1;
            });
          },
        );
    }
  }
}
