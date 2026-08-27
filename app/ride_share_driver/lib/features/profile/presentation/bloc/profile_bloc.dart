import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/profile_remote_datasource.dart';
import '../../data/models/driver_document_model.dart';
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
  final String? vehicleModel;
  final String? vehicleNumber;
  final String? vehicleYear;
  final String? vehicleColor;

  UpdateProfile({
    this.name,
    this.email,
    this.dateOfBirth,
    this.gender,
    this.vehicleModel,
    this.vehicleNumber,
    this.vehicleYear,
    this.vehicleColor,
  });
}

class LoadDriverDocuments extends ProfileEvent {}

class UploadDriverDocument extends ProfileEvent {
  final String documentTypeId;
  final String? documentNumber;
  final String? expiryDate;
  final String? key;
  final String side;

  UploadDriverDocument({
    required this.documentTypeId,
    this.documentNumber,
    this.expiryDate,
    this.key,
    this.side = 'front',
  });
}

// ── States ───────────────────────────────────────────────────────────────────
abstract class ProfileState {}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {
  final DriverProfile? previousProfile;
  final DriverDashboardSummary? previousSummary;
  final List<DriverDocumentItem>? previousDocuments;
  ProfileLoading({this.previousProfile, this.previousSummary, this.previousDocuments});
}

class ProfileLoaded extends ProfileState {
  final DriverProfile profile;
  final DriverDashboardSummary? summary;
  final List<DriverDocumentItem> documents;
  ProfileLoaded(this.profile, {this.summary, this.documents = const []});
}

class ProfileUpdating extends ProfileState {
  final DriverProfile profile;
  final DriverDashboardSummary? summary;
  final List<DriverDocumentItem> documents;
  ProfileUpdating(this.profile, {this.summary, this.documents = const []});
}

class ProfileUpdateSuccess extends ProfileState {
  final String message;
  final DriverProfile profile;
  final DriverDashboardSummary? summary;
  final List<DriverDocumentItem> documents;
  ProfileUpdateSuccess(this.message, this.profile, {this.summary, this.documents = const []});
}

class ProfileDocumentUploading extends ProfileState {
  final DriverProfile? profile;
  final List<DriverDocumentItem> documents;
  ProfileDocumentUploading({this.profile, this.documents = const []});
}

class ProfileDocumentUploadSuccess extends ProfileState {
  final String message;
  final DriverProfile? profile;
  final List<DriverDocumentItem> documents;
  ProfileDocumentUploadSuccess(this.message, {this.profile, this.documents = const []});
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
    on<LoadDriverDocuments>(_onLoadDriverDocuments);
    on<UploadDriverDocument>(_onUploadDriverDocument);
  }

  (DriverProfile?, DriverDashboardSummary?, List<DriverDocumentItem>) _extractPrevious() {
    final s = state;
    if (s is ProfileLoaded) return (s.profile, s.summary, s.documents);
    if (s is ProfileUpdateSuccess) return (s.profile, s.summary, s.documents);
    if (s is ProfileUpdating) return (s.profile, s.summary, s.documents);
    if (s is ProfileLoading) return (s.previousProfile, s.previousSummary, s.previousDocuments ?? []);
    if (s is ProfileDocumentUploading) return (s.profile, null, s.documents);
    if (s is ProfileDocumentUploadSuccess) return (s.profile, null, s.documents);
    return (null, null, []);
  }

  Future<void> _onLoadProfile(LoadProfile event, Emitter<ProfileState> emit) async {
    final (prevProfile, prevSummary, prevDocs) = _extractPrevious();
    emit(ProfileLoading(previousProfile: prevProfile, previousSummary: prevSummary, previousDocuments: prevDocs));
    try {
      final results = await Future.wait([
        dataSource.getProfile(),
        dataSource.getDashboardSummary().catchError((e) {
          return <String, dynamic>{};
        }),
        dataSource.getDocuments().catchError((e) {
          return <dynamic>[];
        }),
      ]);
      final profileJson = results[0] as Map<String, dynamic>;
      final summaryJson = results[1] as Map<String, dynamic>;
      final docsJson = results[2] as List<dynamic>;

      final profile = DriverProfile.fromJson(profileJson);
      final summary = summaryJson.isNotEmpty
          ? DriverDashboardSummary.fromJson(summaryJson)
          : prevSummary;
      final docs = docsJson
          .map((d) => DriverDocumentItem.fromJson(d as Map<String, dynamic>))
          .toList();

      emit(ProfileLoaded(profile, summary: summary, documents: docs));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onUpdateProfile(UpdateProfile event, Emitter<ProfileState> emit) async {
    final (prevProfile, prevSummary, prevDocs) = _extractPrevious();
    if (prevProfile == null) return;
    emit(ProfileUpdating(prevProfile, summary: prevSummary, documents: prevDocs));
    try {
      final updates = <String, dynamic>{
        if (event.name != null) 'name': event.name,
        if (event.email != null) 'email': event.email,
        if (event.dateOfBirth != null) 'dateOfBirth': event.dateOfBirth,
        if (event.gender != null) 'gender': event.gender,
        if (event.vehicleModel != null) 'vehicleModel': event.vehicleModel,
        if (event.vehicleNumber != null) 'vehicleNumber': event.vehicleNumber,
        if (event.vehicleYear != null) 'vehicleYear': event.vehicleYear,
        if (event.vehicleColor != null) 'vehicleColor': event.vehicleColor,
      };
      final json = await dataSource.updateProfile(updates);
      final updatedProfile = DriverProfile.fromJson(json);
      emit(ProfileUpdateSuccess('Profile updated successfully!', updatedProfile, summary: prevSummary, documents: prevDocs));
      add(LoadProfile());
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onLoadDriverDocuments(LoadDriverDocuments event, Emitter<ProfileState> emit) async {
    try {
      final docsJson = await dataSource.getDocuments();
      final docs = docsJson
          .map((d) => DriverDocumentItem.fromJson(d as Map<String, dynamic>))
          .toList();
      final (prevProfile, prevSummary, _) = _extractPrevious();
      if (prevProfile != null) {
        emit(ProfileLoaded(prevProfile, summary: prevSummary, documents: docs));
      }
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onUploadDriverDocument(UploadDriverDocument event, Emitter<ProfileState> emit) async {
    final (prevProfile, _, prevDocs) = _extractPrevious();
    emit(ProfileDocumentUploading(profile: prevProfile, documents: prevDocs));
    try {
      await dataSource.uploadDocument(
        event.documentTypeId,
        documentNumber: event.documentNumber,
        expiryDate: event.expiryDate,
        key: event.key,
        side: event.side,
      );
      final docsJson = await dataSource.getDocuments();
      final docs = docsJson
          .map((d) => DriverDocumentItem.fromJson(d as Map<String, dynamic>))
          .toList();
      emit(ProfileDocumentUploadSuccess('Document submitted for verification!', profile: prevProfile, documents: docs));
      add(LoadProfile());
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }
}
