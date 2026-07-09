import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/driver.dart';
import '../../../domain/entities/geo.dart';
import '../../../domain/entities/document.dart';
import '../../../domain/entities/vehicle.dart';
import '../../../domain/entities/question.dart';
import '../../../domain/repositories/onboarding_repository.dart';

// ── Events ──────────────────────────────────────────────────────────────────
abstract class OnboardingEvent {}

class LoadOnboardingConfig extends OnboardingEvent {}

class UpdatePersonalInfo extends OnboardingEvent {
  final String name;
  final String email;
  final String? dob;
  final String? gender;
  final String? referralCode;
  UpdatePersonalInfo({required this.name, required this.email, this.dob, this.gender, this.referralCode});
}

class SelectDrivingRegion extends OnboardingEvent {
  final String countryId;
  final String stateId;
  final String cityId;
  SelectDrivingRegion({required this.countryId, required this.stateId, required this.cityId});
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
  AddVehicleDetails({required this.vehicleTypeId, required this.model, required this.year, required this.registrationNumber, this.color});
}

class UploadDocumentFileEvent extends OnboardingEvent {
  final String documentTypeId;
  final String side;
  final String docNumber;
  final String? expiryDate;
  final List<int> bytes;
  final String contentType;
  UploadDocumentFileEvent({required this.documentTypeId, required this.side, required this.docNumber, this.expiryDate, required this.bytes, required this.contentType});
}

class UploadProfilePhotoEvent extends OnboardingEvent {
  final List<int> bytes;
  final String contentType;
  UploadProfilePhotoEvent({required this.bytes, required this.contentType});
}

class LoadRegistrationSummary extends OnboardingEvent {}

class SubmitOnboardingApplication extends OnboardingEvent {}

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

class OnboardingError extends OnboardingState {
  final String message;
  OnboardingError({required this.message});
}

// ── BLoC ───────────────────────────────────────────────────────────────────
class OnboardingBloc extends Bloc<OnboardingEvent, OnboardingState> {
  final OnboardingRepository onboardingRepository;

  OnboardingBloc({required this.onboardingRepository}) : super(OnboardingInitial()) {
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
        // 1. request upload url
        final uploadUrl = await onboardingRepository.requestUploadUrl(event.documentTypeId, event.side, event.contentType);
        
        // Extract key from URL or use URL direct for simulated upload
        final String key = uploadUrl.split('?').first.split('/').last;

        // 2. Upload file
        await onboardingRepository.uploadDocumentFile(uploadUrl, event.bytes, event.contentType);

        // 3. Confirm document upload to backend
        await onboardingRepository.confirmDocument(
          event.documentTypeId,
          side: event.side,
          key: key,
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
        final uploadUrl = await onboardingRepository.requestProfilePhotoUploadUrl(event.contentType);
        final String key = uploadUrl.split('?').first.split('/').last;

        await onboardingRepository.uploadDocumentFile(uploadUrl, event.bytes, event.contentType);
        await onboardingRepository.confirmProfilePhoto(key);

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
  }
}
