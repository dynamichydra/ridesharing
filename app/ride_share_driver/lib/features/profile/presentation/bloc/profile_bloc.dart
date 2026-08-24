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

class ProfileLoading extends ProfileState {
  /// Carry forward stale data so the UI can keep showing previous values
  /// while the refresh is in progress instead of flashing zeros.
  final DriverProfile? previousProfile;
  final DriverDashboardSummary? previousSummary;
  ProfileLoading({this.previousProfile, this.previousSummary});
}

class ProfileLoaded extends ProfileState {
  final DriverProfile profile;
  final DriverDashboardSummary? summary;
  ProfileLoaded(this.profile, {this.summary});
}

class ProfileUpdating extends ProfileState {
  final DriverProfile profile;
  final DriverDashboardSummary? summary;
  ProfileUpdating(this.profile, {this.summary});
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

  /// Extract the last-known profile and summary from the current state
  /// so we can carry them through loading transitions.
  (DriverProfile?, DriverDashboardSummary?) _extractPrevious() {
    final s = state;
    if (s is ProfileLoaded) return (s.profile, s.summary);
    if (s is ProfileUpdateSuccess) return (s.profile, s.summary);
    if (s is ProfileUpdating) return (s.profile, s.summary);
    if (s is ProfileLoading) return (s.previousProfile, s.previousSummary);
    return (null, null);
  }

  Future<void> _onLoadProfile(LoadProfile event, Emitter<ProfileState> emit) async {
    final (prevProfile, prevSummary) = _extractPrevious();
    emit(ProfileLoading(previousProfile: prevProfile, previousSummary: prevSummary));
    try {
      final results = await Future.wait([
        dataSource.getProfile(),
        dataSource.getDashboardSummary().catchError((e) {
          // Log but don't crash — summary is optional for the dashboard.
          // ignore: avoid_print
          print('[ProfileBloc] getDashboardSummary failed: $e');
          return <String, dynamic>{};
        }),
      ]);
      final profileJson = results[0];
      final summaryJson = results[1];
      final profile = DriverProfile.fromJson(profileJson);
      final summary = summaryJson.isNotEmpty
          ? DriverDashboardSummary.fromJson(summaryJson)
          : prevSummary; // Fall back to stale summary on API failure
      emit(ProfileLoaded(profile, summary: summary));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onUpdateProfile(UpdateProfile event, Emitter<ProfileState> emit) async {
    final (prevProfile, prevSummary) = _extractPrevious();
    if (prevProfile == null) return;
    emit(ProfileUpdating(prevProfile, summary: prevSummary));
    try {
      final updates = <String, dynamic>{
        if (event.name != null) 'name': event.name,
        if (event.email != null) 'email': event.email,
        if (event.dateOfBirth != null) 'dateOfBirth': event.dateOfBirth,
        if (event.gender != null) 'gender': event.gender,
      };
      final json = await dataSource.updateProfile(updates);
      emit(ProfileUpdateSuccess(DriverProfile.fromJson(json), summary: prevSummary));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }
}
