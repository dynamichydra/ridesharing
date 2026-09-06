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

class AddSavedPlaceEvent extends ProfileEvent {
  final Map<String, dynamic> place;
  const AddSavedPlaceEvent(this.place);
  @override
  List<Object?> get props => [place];
}

class UpdateSavedPlaceEvent extends ProfileEvent {
  final String id;
  final Map<String, dynamic> place;
  const UpdateSavedPlaceEvent(this.id, this.place);
  @override
  List<Object?> get props => [id, place];
}

class DeleteSavedPlaceEvent extends ProfileEvent {
  final String id;
  const DeleteSavedPlaceEvent(this.id);
  @override
  List<Object?> get props => [id];
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
    on<AddSavedPlaceEvent>(_onAddSavedPlace);
    on<UpdateSavedPlaceEvent>(_onUpdateSavedPlace);
    on<DeleteSavedPlaceEvent>(_onDeleteSavedPlace);
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
      String msg = e.toString();
      if (msg.startsWith('Exception: ')) {
        msg = msg.substring(11);
      }
      emit(ProfileError(msg));
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
    final currentState = state;
    if (currentState is ProfileLoaded) {
      final updatedProfile = Map<String, dynamic>.from(currentState.userProfile);
      updatedProfile['saved_places'] = event.places;
      emit(currentState.copyWith(userProfile: updatedProfile));
      try {
        await _profileRepository.updateSavedPlaces(event.places);
        final profile = await _profileRepository.getUserProfile();
        emit(currentState.copyWith(userProfile: profile));
      } catch (e) {
        emit(ProfileError(e.toString()));
      }
    } else {
      emit(ProfileLoading());
      try {
        await _profileRepository.updateSavedPlaces(event.places);
        final profile = await _profileRepository.getUserProfile();
        emit(ProfileLoaded(userProfile: profile));
      } catch (e) {
        emit(ProfileError(e.toString()));
      }
    }
  }

  Future<void> _onAddSavedPlace(AddSavedPlaceEvent event, Emitter<ProfileState> emit) async {
    final currentState = state;
    if (currentState is ProfileLoaded) {
      final existingPlaces = List<Map<String, dynamic>>.from(currentState.userProfile['saved_places'] as List? ?? []);
      final rawLabel = (event.place['label'] ?? event.place['type'] ?? 'favorite').toString().toLowerCase();
      
      // If home or work, replace if existing
      if (['home', 'work'].contains(rawLabel)) {
        existingPlaces.removeWhere((p) => (p['label'] ?? p['type'] ?? '').toString().toLowerCase() == rawLabel);
      }
      existingPlaces.add(event.place);

      final updatedProfile = Map<String, dynamic>.from(currentState.userProfile);
      updatedProfile['saved_places'] = existingPlaces;
      emit(currentState.copyWith(userProfile: updatedProfile));

      try {
        await _profileRepository.addSavedPlace(event.place);
        final profile = await _profileRepository.getUserProfile();
        emit(currentState.copyWith(userProfile: profile));
      } catch (_) {}
    }
  }

  Future<void> _onUpdateSavedPlace(UpdateSavedPlaceEvent event, Emitter<ProfileState> emit) async {
    final currentState = state;
    if (currentState is ProfileLoaded) {
      final existingPlaces = List<Map<String, dynamic>>.from(currentState.userProfile['saved_places'] as List? ?? []);
      final index = existingPlaces.indexWhere((p) => p['id']?.toString() == event.id);
      if (index != -1) {
        existingPlaces[index] = {...existingPlaces[index], ...event.place};
      } else {
        existingPlaces.add(event.place);
      }

      final updatedProfile = Map<String, dynamic>.from(currentState.userProfile);
      updatedProfile['saved_places'] = existingPlaces;
      emit(currentState.copyWith(userProfile: updatedProfile));

      try {
        await _profileRepository.updateSavedPlace(event.id, event.place);
        final profile = await _profileRepository.getUserProfile();
        emit(currentState.copyWith(userProfile: profile));
      } catch (_) {}
    }
  }

  Future<void> _onDeleteSavedPlace(DeleteSavedPlaceEvent event, Emitter<ProfileState> emit) async {
    final currentState = state;
    if (currentState is ProfileLoaded) {
      final existingPlaces = List<Map<String, dynamic>>.from(currentState.userProfile['saved_places'] as List? ?? [])
        ..removeWhere((p) => p['id']?.toString() == event.id);

      final updatedProfile = Map<String, dynamic>.from(currentState.userProfile);
      updatedProfile['saved_places'] = existingPlaces;
      emit(currentState.copyWith(userProfile: updatedProfile));

      try {
        await _profileRepository.deleteSavedPlace(event.id);
        final profile = await _profileRepository.getUserProfile();
        emit(currentState.copyWith(userProfile: profile));
      } catch (_) {}
    }
  }

  Future<void> _onUpdatePaymentMethods(UpdatePaymentMethods event, Emitter<ProfileState> emit) async {
    final currentState = state;
    if (currentState is ProfileLoaded) {
      final updatedProfile = Map<String, dynamic>.from(currentState.userProfile);
      updatedProfile['payment_methods'] = event.methods;
      emit(currentState.copyWith(userProfile: updatedProfile));
      try {
        await _profileRepository.updatePaymentMethods(event.methods);
        final profile = await _profileRepository.getUserProfile();
        emit(currentState.copyWith(userProfile: profile));
      } catch (e) {
        emit(ProfileError(e.toString()));
      }
    } else {
      emit(ProfileLoading());
      try {
        await _profileRepository.updatePaymentMethods(event.methods);
        final profile = await _profileRepository.getUserProfile();
        emit(ProfileLoaded(userProfile: profile));
      } catch (e) {
        emit(ProfileError(e.toString()));
      }
    }
  }
}
