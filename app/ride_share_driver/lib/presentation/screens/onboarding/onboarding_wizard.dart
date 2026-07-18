import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../style/appcolors.dart';
import '../../../domain/repositories/onboarding_repository.dart';
import '../../../injection_container.dart';
import '../../bloc/onboarding/onboarding_bloc.dart';
import '../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../domain/entities/document.dart';

// Screens
import 'welcome_screen.dart';
import '../../../features/auth/presentation/screens/phone_auth_screen.dart';
import '../../../features/auth/presentation/screens/otp_verification_screen.dart';
import 'personal_info_screen.dart';
import 'terms_legal_screen.dart';
import 'driving_location_screen.dart';
import 'vehicle_selection_screen.dart';
import 'vehicle_form_screen.dart';
import 'checklist_screen.dart';
import 'document_upload_screen.dart';
import '../../../common/widgets/custom_toast.dart';
import 'profile_photo_screen.dart';
import 'bank_details_screen.dart';
import 'emergency_contact_screen.dart';
import 'questionnaire_screen.dart';
import 'registration_status_screen.dart';

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

  // Checklist navigation tracking
  bool _enteredFromChecklist = false;
  bool _needsVehicleRental = false;

  // A `rejected` driver actively chose "Edit & Resubmit" from the status
  // screen — keeps the normal wizard visible instead of the status screen
  // even though registrationStatus is still 'rejected' server-side until
  // they actually resubmit.
  bool _isEditingRejectedApplication = false;
  bool _transitionOnSummaryLoad = false;

  // In-memory mock steps details persistence
  String? _bankHolder;
  String? _bankName;
  String? _bankAccount;
  String? _bankIfsc;
  String? _emergencyName;
  String? _emergencyPhone;
  String? _emergencyRelationship;

  // Track simulated checklist items completed but not saved in DB
  final Set<String> _simulatedCompletedItems = {};
  String? _selectedUploadDocCode;

  @override
  void initState() {
    super.initState();
    final authState = context.read<AuthBloc>().state;
    if (authState is Authenticated) {
      context.read<OnboardingBloc>().add(LoadOnboardingConfig());
      _currentStep = 2;
    }
  }

  void _nextStep() {
    setState(() {
      _currentStep++;
    });
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        if (_enteredFromChecklist) {
          _currentStep = 9;
          _enteredFromChecklist = false;
        } else if (_currentStep >= 10) {
          _currentStep = 9; // Go back to checklist from subflows
        } else if (_currentStep == 9) {
          if (_needsVehicleRental) {
            _currentStep = 7;
          } else {
            _currentStep = 8;
          }
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
            // Blocking statuses (pending_review/under_verification/rejected/
            // suspended) are now handled by RegistrationStatusScreen in the
            // builder below instead of a one-shot dialog that used to force
            // a logout on dismiss — a `rejected` driver needs to be able to
            // edit and resubmit, not just see a message and get logged out.
            debugPrint(
              '[OnboardingWizard] AuthState transitioned to Authenticated. Fetching configuration.',
            );
            context.read<OnboardingBloc>().add(LoadOnboardingConfig());
          } else if (authState is AuthOtpSent) {
            debugPrint(
              '[OnboardingWizard] AuthState: AuthOtpSent. Moving to OTP Verification screen.',
            );
            if (_currentStep == 1) {
              _nextStep();
            }
          } else if (authState is AuthError) {
            debugPrint(
              '[OnboardingWizard] AuthState: AuthError: ${authState.message}',
            );
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
              context.read<OnboardingBloc>().add(LoadOnboardingProgress());
            } else if (state is OnboardingProgressLoaded) {
              // An admin published a newer terms/privacy version since this
              // driver last accepted — interrupt wherever they are and force
              // them back to the legal step, regardless of registrationStep.
              if (state.progress.pendingLegalAcceptance && _currentStep != 4) {
                setState(() {
                  _currentStep = 4;
                });
              }
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

                if (_currentStep == 2) {
                  final regStep = state.summary.driver.registrationStep;
                  if (regStep < 2) {
                    _currentStep = 3; // Personal Info
                  } else if (regStep == 2) {
                    _currentStep = 4; // Terms / Legal
                  } else if (regStep == 3) {
                    _currentStep = 5; // Driving Location
                  } else if (regStep == 4) {
                    _currentStep = 6; // Questionnaire
                  } else if (regStep == 5) {
                    _currentStep = 7; // Vehicle Selection
                  } else {
                    _currentStep = 9; // Checklist
                  }
                } else if (_transitionOnSummaryLoad) {
                  _transitionOnSummaryLoad = false;
                  bool shouldGoBackToChecklist = true;

                  if (_currentStep == 10) {
                    final docCode = _selectedUploadDocCode;
                    if (_config != null &&
                        _summary != null &&
                        docCode != null) {
                      DocumentType? docReq;
                      for (final req in _config!.documentRequirements) {
                        if (req.code == docCode) {
                          docReq = req;
                          break;
                        }
                      }
                      if (docReq != null) {
                        DriverDocument? doc;
                        for (final d in _summary!.documents) {
                          if (d.documentTypeId == docReq.id) {
                            doc = d;
                            break;
                          }
                        }

                        if (doc == null) {
                          final needsMultiple =
                              docReq.requiresFront && docReq.requiresBack;
                          if (needsMultiple) {
                            shouldGoBackToChecklist = false;
                          }
                        } else {
                          if (docReq.requiresFront && docReq.requiresBack) {
                            final hadFront =
                                doc.frontUrl != null &&
                                doc.frontUrl!.isNotEmpty;
                            final hadBack =
                                doc.backUrl != null && doc.backUrl!.isNotEmpty;
                            if (!hadFront || !hadBack) {
                              shouldGoBackToChecklist = false;
                            }
                          }
                        }
                      }
                    }
                  }

                  if (shouldGoBackToChecklist) {
                    if (_enteredFromChecklist) {
                      _currentStep = 9;
                      _enteredFromChecklist = false;
                    } else if (_currentStep >= 3 && _currentStep < 9) {
                      _nextStep();
                    } else {
                      _currentStep = 9;
                    }
                  } else {
                    debugPrint(
                      '[OnboardingWizard] Remaining side needs upload, staying on step $_currentStep',
                    );
                  }
                }
              });
            } else if (state is OnboardingSuccess) {
              setState(() {
                _transitionOnSummaryLoad = true;
              });
              context.read<OnboardingBloc>().add(LoadRegistrationSummary());
            } else if (state is ApplicationSubmitted) {
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (context) => AlertDialog(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  title: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check_circle_rounded,
                          color: AppColors.primary,
                          size: 48,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Application Submitted',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  content: const Text(
                    'Your partner application has been successfully submitted. '
                    'Our operations team will review your details and document proofs shortly.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 15,
                      height: 1.4,
                    ),
                  ),
                  actionsAlignment: MainAxisAlignment.center,
                  actions: [
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          setState(() {
                            _currentStep = 0;
                            _phoneNumber = '';
                            _isLogin = false;
                            _config = null;
                            _summary = null;
                            _needsVehicleRental = false;
                            _enteredFromChecklist = false;
                            _isEditingRejectedApplication = false;
                            _simulatedCompletedItems.clear();
                          });
                          context.read<AuthBloc>().add(LogoutRequested());
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'OK',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            } else if (state is OnboardingError) {
              final isEmailDuplicate =
                  state.message.toLowerCase().contains('email') ||
                  state.message.toLowerCase().contains('duplicate') ||
                  state.message.toLowerCase().contains('already in use') ||
                  state.message.toLowerCase().contains('already registered');
              if (isEmailDuplicate) {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                    title: Row(
                      children: [
                        const Icon(
                          Icons.warning_amber_rounded,
                          color: AppColors.error,
                          size: 28,
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'Email in Use',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    content: const Text(
                      'This email address is already in use by another account. Please use a different email address.',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 15,
                        height: 1.4,
                      ),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text(
                          'OK',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              } else {
                CustomToast.show(context, state.message);
              }
            }
          },
          builder: (context, state) {
            final authState = context.watch<AuthBloc>().state;
            if (authState is Authenticated && !_isEditingRejectedApplication) {
              final status = authState.driver.registrationStatus;
              const blockingStatuses = {
                'pending_review',
                'under_verification',
                'suspended',
                'rejected',
              };
              if (blockingStatuses.contains(status)) {
                return RegistrationStatusScreen(
                  status: status,
                  note: authState.driver.approvalNote,
                  onEditAndResubmit: status == 'rejected'
                      ? () {
                          setState(() {
                            _isEditingRejectedApplication = true;
                            _currentStep =
                                9; // checklist — shows exactly what's incomplete
                          });
                        }
                      : null,
                  onLogout: () {
                    context.read<AuthBloc>().add(LogoutRequested());
                    setState(() {
                      _currentStep = 0;
                      _phoneNumber = '';
                      _isLogin = false;
                      _config = null;
                      _summary = null;
                      _needsVehicleRental = false;
                      _enteredFromChecklist = false;
                      _isEditingRejectedApplication = false;
                      _simulatedCompletedItems.clear();
                    });
                  },
                );
              }
            }

            return Scaffold(
              backgroundColor: Colors.white,
              extendBodyBehindAppBar: _currentStep <= 2,
              appBar: _currentStep > 0
                  ? AppBar(
                      backgroundColor: _currentStep <= 2
                          ? Colors.transparent
                          : Colors.white,
                      elevation: 0,
                      leading: IconButton(
                        icon: Icon(
                          Icons.arrow_back_rounded,
                          color: _currentStep <= 2
                              ? Colors.white
                              : AppColors.textPrimary,
                        ),
                        onPressed: _prevStep,
                      ),
                      title: Text(
                        _currentStep >= 9
                            ? l10n.verificationSteps
                            : (_currentStep >= 3
                                  ? l10n.stepNOf8(_currentStep - 2)
                                  : ''),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: _currentStep <= 2
                              ? Colors.white
                              : AppColors.textSecondary,
                        ),
                      ),
                    )
                  : null,
              body: SafeArea(
                top: _currentStep >= 3,
                bottom: _currentStep >= 3,
                child: Column(
                  children: [
                    if (_currentStep >= 3 && _currentStep < 9)
                      LinearProgressIndicator(
                        value: (_currentStep - 2) / 7.0,
                        color: AppColors.primary,
                        backgroundColor: AppColors.border,
                        minHeight: 3,
                      ),
                    if (state is OnboardingLoading)
                      const LinearProgressIndicator(
                        minHeight: 3,
                        color: AppColors.secondary,
                      ),
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
          initialPhone: _phoneNumber,
          onLoginModeChanged: (isLogin) {
            setState(() {
              _isLogin = isLogin;
            });
          },
          onPhoneSubmitted: (phone) {
            _phoneNumber = phone;
            context.read<AuthBloc>().add(
              StartPhoneAuthentication(phone: phone, isLogin: _isLogin),
            );
          },
        );
      case 2:
        return OtpVerificationScreen(
          phoneNumber: _phoneNumber,
          onOtpVerified: (otp) {
            context.read<AuthBloc>().add(
              VerifyOtpCode(phone: _phoneNumber, otp: otp, isLogin: _isLogin),
            );
          },
          onResendRequested: () {
            context.read<AuthBloc>().add(
              StartPhoneAuthentication(phone: _phoneNumber, isLogin: _isLogin),
            );
          },
        );
      case 3:
        return PersonalInfoScreen(
          initialName: _summary?.driver.name,
          initialEmail: _summary?.driver.email,
          initialDob: _summary?.driver.dateOfBirth,
          initialGender: _summary?.driver.gender,
          initialReferralCode: _summary?.driver.referralCode,
          onSave:
              ({
                required String name,
                required String email,
                String? dob,
                String? gender,
                String? referralCode,
              }) {
                context.read<OnboardingBloc>().add(
                  UpdatePersonalInfo(
                    name: name,
                    email: email,
                    dob: dob,
                    gender: gender,
                    referralCode: referralCode,
                  ),
                );
              },
        );
      case 4:
        return TermsLegalScreen(
          termsUrl: _config?.termsUrl,
          privacyUrl: _config?.privacyPolicyUrl,
          fetchContent: (url) =>
              sl<OnboardingRepository>().fetchLegalContent(url),
          isAlreadyAccepted:
              _summary != null &&
              !_summary!.missing.contains('legalAcceptance'),
          onAccepted: () {
            if (_config?.termsId != null && _config?.privacyPolicyId != null) {
              context.read<OnboardingBloc>().add(
                AcceptTermsAndPrivacy(
                  termsId: _config!.termsId!,
                  privacyId: _config!.privacyPolicyId!,
                ),
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
          initialCountryId: _summary?.driver.countryId,
          initialStateId: _summary?.driver.stateId,
          initialCityId: _summary?.driver.cityId,
          getStates: (countryId) =>
              sl<OnboardingRepository>().getStates(countryId),
          getCities: (stateId) => sl<OnboardingRepository>().getCities(stateId),
          onSave: ({required countryId, required stateId, required cityId}) {
            context.read<OnboardingBloc>().add(
              SelectDrivingRegion(
                countryId: countryId,
                stateId: stateId,
                cityId: cityId,
              ),
            );
          },
        );
      case 6:
        if (_config == null || _summary == null) {
          return const Center(child: CircularProgressIndicator());
        }
        return QuestionnaireScreen(
          questions: _config!.questionnaire,
          existingAnswers: _summary!.answers,
          onSubmit: (answers) {
            context.read<OnboardingBloc>().add(
              SubmitQuestionAnswers(answers: answers),
            );
          },
        );
      case 7:
        return VehicleSelectionScreen(
          onHasVehicle: () {
            setState(() {
              _needsVehicleRental = false;
              _currentStep = 8;
            });
          },
          onNeedVehicle: () {
            if (_config != null) {
              if (_config!.vehicleTypes.isNotEmpty) {
                final firstType = _config!.vehicleTypes.first;
                context.read<OnboardingBloc>().add(
                  AddVehicleDetails(
                    vehicleTypeId: firstType.id,
                    model: 'Rental (Requested)',
                    year: DateTime.now().year.toString(),
                    registrationNumber:
                        'RENTAL-${_summary?.driver.id.substring(0, 8).toUpperCase() ?? "VEHICLE"}',
                    color: 'Virtual',
                  ),
                );
              }
              // Submit dummy documents for VEHICLE_REGISTRATION and INSURANCE_CERTIFICATE
              for (final docType in _config!.documentRequirements) {
                if (docType.code == 'VEHICLE_REGISTRATION' ||
                    docType.code == 'INSURANCE_CERTIFICATE') {
                  context.read<OnboardingBloc>().add(
                    UploadDocumentFileEvent(
                      documentTypeId: docType.id,
                      side: 'front',
                      docNumber: 'RENTAL-PLACEHOLDER',
                      bytes: [137, 80, 78, 71, 13, 10, 26, 10],
                      contentType: 'image/png',
                    ),
                  );
                  if (docType.requiresBack) {
                    context.read<OnboardingBloc>().add(
                      UploadDocumentFileEvent(
                        documentTypeId: docType.id,
                        side: 'back',
                        docNumber: 'RENTAL-PLACEHOLDER',
                        bytes: [137, 80, 78, 71, 13, 10, 26, 10],
                        contentType: 'image/png',
                      ),
                    );
                  }
                }
              }
            }
            setState(() {
              _needsVehicleRental = true;
              _currentStep = 9;
            });
          },
        );
      case 8:
        if (_config == null) {
          return const Center(child: CircularProgressIndicator());
        }
        final existingVehicle = _summary?.vehicles.isNotEmpty == true
            ? _summary!.vehicles.first
            : null;
        return VehicleFormScreen(
          vehicleTypes: _config!.vehicleTypes,
          initialVehicleTypeId: existingVehicle?.vehicleTypeId,
          initialModel: existingVehicle?.model,
          initialYear: existingVehicle?.year,
          initialRegistrationNumber: existingVehicle?.registrationNumber,
          initialColor: existingVehicle?.color,
          onSave:
              ({
                color,
                required model,
                required registrationNumber,
                required vehicleTypeId,
                required year,
              }) {
                context.read<OnboardingBloc>().add(
                  AddVehicleDetails(
                    vehicleTypeId: vehicleTypeId,
                    model: model,
                    year: year,
                    registrationNumber: registrationNumber,
                    color: color,
                  ),
                );
              },
        );
      case 9:
        if (_summary == null || _config == null) {
          return const Center(child: CircularProgressIndicator());
        }
        return ChecklistScreen(
          summary: _summary!,
          needsVehicleRental: _needsVehicleRental,
          documentRequirements: _config!.documentRequirements,
          onItemTap: (code) {
            setState(() {
              _enteredFromChecklist = true;
              if (code.startsWith('document:')) {
                _selectedUploadDocCode = code.split(':').last;
                _currentStep = 10;
              } else if (code == 'personal_info') {
                _currentStep = 3;
              } else if (code == 'drivingLocation') {
                _currentStep = 5;
              } else if (code == 'legalAcceptance') {
                _currentStep = 4;
              } else if (code == 'questionnaire') {
                _currentStep = 6;
              } else if (code == 'vehicle') {
                _currentStep = _needsVehicleRental ? 7 : 8;
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
            // Frontend validation for both sides of the required documents
            bool allDocsComplete = true;
            for (final docReq in _config!.documentRequirements) {
              if (docReq.isRequired) {
                DriverDocument? doc;
                for (final d in _summary!.documents) {
                  if (d.documentTypeId == docReq.id) {
                    doc = d;
                    break;
                  }
                }
                if (doc == null) {
                  allDocsComplete = false;
                  break;
                }
                if (docReq.requiresFront &&
                    (doc.frontUrl == null || doc.frontUrl!.isEmpty)) {
                  allDocsComplete = false;
                  break;
                }
                if (docReq.requiresBack &&
                    (doc.backUrl == null || doc.backUrl!.isEmpty)) {
                  allDocsComplete = false;
                  break;
                }
                if (docReq.requiresPdf &&
                    (doc.pdfUrl == null || doc.pdfUrl!.isEmpty)) {
                  allDocsComplete = false;
                  break;
                }
              }
            }

            if (!allDocsComplete) {
              CustomToast.show(
                context,
                'Please upload all required document sides (front & back).',
              );
              return;
            }

            context.read<OnboardingBloc>().add(SubmitOnboardingApplication());
          },
        );
      case 10:
        if (_config == null || _selectedUploadDocCode == null) {
          return const Center(child: CircularProgressIndicator());
        }
        final docType = _config!.documentRequirements.firstWhere(
          (d) => d.code == _selectedUploadDocCode,
        );
        final matches = _summary?.documents.where(
          (d) => d.documentTypeId == docType.id,
        );
        final existing = (matches != null && matches.isNotEmpty)
            ? matches.first
            : null;

        return DocumentUploadScreen(
          docType: docType,
          existingDoc: existing,
          onUpload:
              ({
                required bytes,
                required contentType,
                required docNumber,
                expiryDate,
                required side,
              }) {
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
          initialHolder: _bankHolder,
          initialBankName: _bankName,
          initialAccount: _bankAccount,
          initialIfsc: _bankIfsc,
          onSkip: () {
            setState(() {
              _currentStep = 9;
              _enteredFromChecklist = false;
            });
          },
          onSave:
              ({
                required accountNumber,
                required bankName,
                required holder,
                required ifscCode,
              }) {
                setState(() {
                  _bankHolder = holder;
                  _bankName = bankName;
                  _bankAccount = accountNumber;
                  _bankIfsc = ifscCode;
                  _simulatedCompletedItems.add('bank_details');
                  _currentStep = 9;
                  _enteredFromChecklist = false;
                });
                context.read<OnboardingBloc>().add(LoadRegistrationSummary());
              },
        );
      case 14:
        return EmergencyContactScreen(
          initialName: _emergencyName,
          initialPhone: _emergencyPhone,
          initialRelationship: _emergencyRelationship,
          onSkip: () {
            setState(() {
              _currentStep = 9;
              _enteredFromChecklist = false;
            });
          },
          onSave: ({required name, required phone, required relationship}) {
            setState(() {
              _emergencyName = name;
              _emergencyPhone = phone;
              _emergencyRelationship = relationship;
              _simulatedCompletedItems.add('emergency_contact');
              _currentStep = 9;
              _enteredFromChecklist = false;
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
