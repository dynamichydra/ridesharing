import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/profile_remote_datasource.dart';
import '../../../../common/entities/driver_profile.dart';
import '../../../../common/entities/driver_dashboard_summary.dart';

// ── Events ───────────────────────────────────────────────────────────────────
abstract class ProfileEvent {}

class LoadProfile extends ProfileEvent {}

class UpdateProfile extends ProfileEvent {
  final String? name;
  final String? email;
  final String? dateOfBirth;
  final String? gender;
  UpdateProfile({this.name, this.email, this.dateOfBirth, this.gender});
}

// ── States ───────────────────────────────────────────────────────────────────
abstract class ProfileState {}

class ProfileInitial extends ProfileState {}
class ProfileLoading extends ProfileState {}

class ProfileLoaded extends ProfileState {
  final DriverProfile profile;
  final DriverDashboardSummary? summary;
  ProfileLoaded(this.profile, {this.summary});
}

class ProfileUpdating extends ProfileState {
  final DriverProfile profile;
  ProfileUpdating(this.profile);
}

class ProfileUpdateSuccess extends ProfileState {
  final DriverProfile profile;
  final DriverDashboardSummary? summary;
  ProfileUpdateSuccess(this.profile, {this.summary});
}

class ProfileError extends ProfileState {
  final String message;
  ProfileError(this.message);
}

// ── BLoC ──────────────────────────────────────────────────────────────────────
class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRemoteDataSource dataSource;

  ProfileBloc({required this.dataSource}) : super(ProfileInitial()) {
    on<LoadProfile>(_onLoadProfile);
    on<UpdateProfile>(_onUpdateProfile);
  }

  Future<void> _onLoadProfile(LoadProfile event, Emitter<ProfileState> emit) async {
    emit(ProfileLoading());
    try {
      final results = await Future.wait([
        dataSource.getProfile(),
        dataSource.getDashboardSummary().catchError((_) => <String, dynamic>{}),
      ]);
      final profileJson = results[0];
      final summaryJson = results[1];
      final profile = DriverProfile.fromJson(profileJson);
      final summary = summaryJson.isNotEmpty ? DriverDashboardSummary.fromJson(summaryJson) : null;
      emit(ProfileLoaded(profile, summary: summary));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onUpdateProfile(UpdateProfile event, Emitter<ProfileState> emit) async {
    final current = state;
    if (current is! ProfileLoaded && current is! ProfileUpdateSuccess) return;
    final currentProfile = current is ProfileLoaded ? current.profile : (current as ProfileUpdateSuccess).profile;
    emit(ProfileUpdating(currentProfile));
    try {
      final updates = <String, dynamic>{
        if (event.name != null) 'name': event.name,
        if (event.email != null) 'email': event.email,
        if (event.dateOfBirth != null) 'dateOfBirth': event.dateOfBirth,
        if (event.gender != null) 'gender': event.gender,
      };
      final json = await dataSource.updateProfile(updates);
      emit(ProfileUpdateSuccess(DriverProfile.fromJson(json)));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }
}
