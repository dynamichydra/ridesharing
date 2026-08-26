import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../common/entities/driver_profile.dart';
import '../../../domain/entities/onboarding_progress.dart';
import '../../../domain/entities/geo.dart';
import '../../../domain/repositories/onboarding_repository.dart';
import '../../../services/app_logger.dart';

// ── Events ──────────────────────────────────────────────────────────────────
abstract class OnboardingEvent {}

class LoadOnboardingConfig extends OnboardingEvent {}

class UpdatePersonalInfo extends OnboardingEvent {
  final String name;
  final String email;
  final String? dob;
  final String? gender;
  final String? referralCode;
  UpdatePersonalInfo({
    required this.name,
    required this.email,
    this.dob,
    this.gender,
    this.referralCode,
  });
}

class SelectDrivingRegion extends OnboardingEvent {
  final String countryId;
  final String stateId;
  final String cityId;
  SelectDrivingRegion({
    required this.countryId,
    required this.stateId,
    required this.cityId,
  });
}

class AcceptTermsAndPrivacy extends OnboardingEvent {
  final String termsId;
  final String privacyId;
  AcceptTermsAndPrivacy({required this.termsId, required this.privacyId});
}

class SubmitQuestionAnswers extends OnboardingEvent {
  final List<Map<String, dynamic>> answers;
  SubmitQuestionAnswers({required this.answers});
}

class AddVehicleDetails extends OnboardingEvent {
  final String vehicleTypeId;
  final String model;
  final String year;
  final String registrationNumber;
  final String? color;
  AddVehicleDetails({
    required this.vehicleTypeId,
    required this.model,
    required this.year,
    required this.registrationNumber,
    this.color,
  });
}

class UploadDocumentFileEvent extends OnboardingEvent {
  final String documentTypeId;
  final String side;
  final String docNumber;
  final String? expiryDate;
  final List<int> bytes;
  final String contentType;
  UploadDocumentFileEvent({
    required this.documentTypeId,
    required this.side,
    required this.docNumber,
    this.expiryDate,
    required this.bytes,
    required this.contentType,
  });
}

class UploadProfilePhotoEvent extends OnboardingEvent {
  final List<int> bytes;
  final String contentType;
  UploadProfilePhotoEvent({required this.bytes, required this.contentType});
}

class SaveBankDetailsEvent extends OnboardingEvent {
  final String holder;
  final String bankName;
  final String accountNumber;
  final String ifscCode;
  SaveBankDetailsEvent({
    required this.holder,
    required this.bankName,
    required this.accountNumber,
    required this.ifscCode,
  });
}

class LoadRegistrationSummary extends OnboardingEvent {}

class SubmitOnboardingApplication extends OnboardingEvent {}

/// Checks `GET /onboarding/state` for `pendingLegalAcceptance` — e.g. an
/// admin published a new terms/privacy version since this driver last
/// accepted. Deliberately does not emit [OnboardingLoading] first: this is a
/// silent background check, not a user-facing action, and shouldn't flash
/// the wizard's global loading bar.
class LoadOnboardingProgress extends OnboardingEvent {}

// ── States ──────────────────────────────────────────────────────────────────
abstract class OnboardingState {}

class OnboardingInitial extends OnboardingState {}

class OnboardingLoading extends OnboardingState {}

class OnboardingConfigLoaded extends OnboardingState {
  final OnboardingConfig config;
  OnboardingConfigLoaded({required this.config});
}

class StatesLoaded extends OnboardingState {
  final List<StateProvince> states;
  StatesLoaded({required this.states});
}

class CitiesLoaded extends OnboardingState {
  final List<City> cities;
  CitiesLoaded({required this.cities});
}

class OnboardingSuccess extends OnboardingState {}

class RegistrationSummaryLoaded extends OnboardingState {
  final RegistrationSummary summary;
  RegistrationSummaryLoaded({required this.summary});
}

class ApplicationSubmitted extends OnboardingState {
  final DriverProfile driver;
  ApplicationSubmitted({required this.driver});
}

class OnboardingProgressLoaded extends OnboardingState {
  final OnboardingProgress progress;
  OnboardingProgressLoaded({required this.progress});
}

class OnboardingError extends OnboardingState {
  final String message;
  OnboardingError({required this.message});
}

// ── BLoC ───────────────────────────────────────────────────────────────────
class OnboardingBloc extends Bloc<OnboardingEvent, OnboardingState> {
  final OnboardingRepository onboardingRepository;

  OnboardingBloc({required this.onboardingRepository})
    : super(OnboardingInitial()) {
    on<LoadOnboardingConfig>((event, emit) async {
      emit(OnboardingLoading());
      try {
        final config = await onboardingRepository.getOnboardingConfig();
        emit(OnboardingConfigLoaded(config: config));
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<UpdatePersonalInfo>((event, emit) async {
      emit(OnboardingLoading());
      try {
        await onboardingRepository.updateProfile(
          name: event.name,
          email: event.email,
          dob: event.dob,
          gender: event.gender,
          referralCode: event.referralCode,
        );
        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<SelectDrivingRegion>((event, emit) async {
      emit(OnboardingLoading());
      try {
        await onboardingRepository.setDrivingLocation(
          countryId: event.countryId,
          stateId: event.stateId,
          cityId: event.cityId,
        );
        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<AcceptTermsAndPrivacy>((event, emit) async {
      emit(OnboardingLoading());
      try {
        await onboardingRepository.acceptLegalDocument(event.termsId);
        await onboardingRepository.acceptLegalDocument(event.privacyId);
        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<SubmitQuestionAnswers>((event, emit) async {
      emit(OnboardingLoading());
      try {
        await onboardingRepository.submitAnswers(event.answers);
        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<AddVehicleDetails>((event, emit) async {
      emit(OnboardingLoading());
      try {
        await onboardingRepository.addVehicle(
          vehicleTypeId: event.vehicleTypeId,
          model: event.model,
          year: event.year,
          registrationNumber: event.registrationNumber,
          color: event.color,
        );
        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<UploadDocumentFileEvent>((event, emit) async {
      emit(OnboardingLoading());
      try {
        // 1. request upload url & key
        final uploadResp = await onboardingRepository.requestUploadUrl(
          event.documentTypeId,
          event.side,
          event.contentType,
        );

        // 2. Upload file
        await onboardingRepository.uploadDocumentFile(
          uploadResp.uploadUrl,
          event.bytes,
          event.contentType,
        );

        // 3. Confirm document upload to backend
        await onboardingRepository.confirmDocument(
          event.documentTypeId,
          side: event.side,
          key: uploadResp.key,
          documentNumber: event.docNumber,
          expiryDate: event.expiryDate,
        );

        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<UploadProfilePhotoEvent>((event, emit) async {
      emit(OnboardingLoading());
      try {
        final uploadResp = await onboardingRepository
            .requestProfilePhotoUploadUrl(event.contentType);

        await onboardingRepository.uploadDocumentFile(
          uploadResp.uploadUrl,
          event.bytes,
          event.contentType,
        );
        await onboardingRepository.confirmProfilePhoto(uploadResp.key);

        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<SaveBankDetailsEvent>((event, emit) async {
      emit(OnboardingLoading());
      try {
        await onboardingRepository.submitBankDetails(
          holder: event.holder,
          bankName: event.bankName,
          accountNumber: event.accountNumber,
          ifscCode: event.ifscCode,
        );
        emit(OnboardingSuccess());
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<LoadRegistrationSummary>((event, emit) async {
      emit(OnboardingLoading());
      try {
        final summary = await onboardingRepository.getRegistrationSummary();
        emit(RegistrationSummaryLoaded(summary: summary));
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<SubmitOnboardingApplication>((event, emit) async {
      emit(OnboardingLoading());
      try {
        final driver = await onboardingRepository.submitApplication();
        emit(ApplicationSubmitted(driver: driver));
      } catch (e) {
        emit(OnboardingError(message: e.toString()));
      }
    });

    on<LoadOnboardingProgress>((event, emit) async {
      try {
        final progress = await onboardingRepository.getOnboardingState();
        emit(OnboardingProgressLoaded(progress: progress));
      } catch (e) {
        // Best-effort: a failed background check (e.g. a flaky connection)
        // shouldn't surface an alarming error toast for something the driver
        // never asked for. It's retried next time onboarding config loads.
        AppLogger.w('[OnboardingBloc] LoadOnboardingProgress failed: $e');
      }
    });
  }
}
