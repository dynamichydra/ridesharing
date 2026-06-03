import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/profile_repository.dart';

// ==========================================
// Profile Events
// ==========================================
abstract class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object?> get props => [];
}

class LoadProfile extends ProfileEvent {}

class UpdateProfileDetails extends ProfileEvent {
  final String name;
  final String email;
  final String phone;

  const UpdateProfileDetails({required this.name, required this.email, required this.phone});

  @override
  List<Object?> get props => [name, email, phone];
}

class LoadRideHistoryEvent extends ProfileEvent {}

class UpdatePlaces extends ProfileEvent {
  final List<Map<String, dynamic>> places;

  const UpdatePlaces(this.places);

  @override
  List<Object?> get props => [places];
}

class UpdatePaymentMethods extends ProfileEvent {
  final List<Map<String, dynamic>> methods;

  const UpdatePaymentMethods(this.methods);

  @override
  List<Object?> get props => [methods];
}

// ==========================================
// Profile States
// ==========================================
abstract class ProfileState extends Equatable {
  const ProfileState();

  @override
  List<Object?> get props => [];
}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {}

class ProfileLoaded extends ProfileState {
  final Map<String, dynamic> userProfile;
  final List<Map<String, dynamic>> rideHistory;

  const ProfileLoaded({required this.userProfile, this.rideHistory = const []});

  ProfileLoaded copyWith({
    Map<String, dynamic>? userProfile,
    List<Map<String, dynamic>>? rideHistory,
  }) {
    return ProfileLoaded(
      userProfile: userProfile ?? this.userProfile,
      rideHistory: rideHistory ?? this.rideHistory,
    );
  }

  @override
  List<Object?> get props => [userProfile, rideHistory];
}

class ProfileUpdateSuccess extends ProfileState {}

class ProfileError extends ProfileState {
  final String message;

  const ProfileError(this.message);

  @override
  List<Object?> get props => [message];
}

// ==========================================
// Profile BLoC
// ==========================================
class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRepository _profileRepository;

  ProfileBloc(this._profileRepository) : super(ProfileInitial()) {
    on<LoadProfile>(_onLoadProfile);
    on<UpdateProfileDetails>(_onUpdateProfileDetails);
    on<LoadRideHistoryEvent>(_onLoadRideHistory);
    on<UpdatePlaces>(_onUpdatePlaces);
    on<UpdatePaymentMethods>(_onUpdatePaymentMethods);
  }

  Future<void> _onLoadProfile(LoadProfile event, Emitter<ProfileState> emit) async {
    emit(ProfileLoading());
    try {
      final profile = await _profileRepository.getUserProfile();
      final history = await _profileRepository.getRideHistory();
      emit(ProfileLoaded(userProfile: profile, rideHistory: history));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onUpdateProfileDetails(UpdateProfileDetails event, Emitter<ProfileState> emit) async {
    emit(ProfileLoading());
    try {
      await _profileRepository.updateUserProfile(event.name, event.email, event.phone);
      emit(ProfileUpdateSuccess());
      add(LoadProfile());
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onLoadRideHistory(LoadRideHistoryEvent event, Emitter<ProfileState> emit) async {
    final currentState = state;
    if (currentState is ProfileLoaded) {
      emit(ProfileLoading());
      try {
        final history = await _profileRepository.getRideHistory();
        emit(currentState.copyWith(rideHistory: history));
      } catch (e) {
        emit(ProfileError(e.toString()));
      }
    } else {
      emit(ProfileLoading());
      try {
        final profile = await _profileRepository.getUserProfile();
        final history = await _profileRepository.getRideHistory();
        emit(ProfileLoaded(userProfile: profile, rideHistory: history));
      } catch (e) {
        emit(ProfileError(e.toString()));
      }
    }
  }

  Future<void> _onUpdatePlaces(UpdatePlaces event, Emitter<ProfileState> emit) async {
    emit(ProfileLoading());
    try {
      await _profileRepository.updateSavedPlaces(event.places);
      emit(ProfileUpdateSuccess());
      add(LoadProfile());
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onUpdatePaymentMethods(UpdatePaymentMethods event, Emitter<ProfileState> emit) async {
    emit(ProfileLoading());
    try {
      await _profileRepository.updatePaymentMethods(event.methods);
      emit(ProfileUpdateSuccess());
      add(LoadProfile());
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }
}
