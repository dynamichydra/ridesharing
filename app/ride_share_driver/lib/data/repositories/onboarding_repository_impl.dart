import '../../common/entities/driver_profile.dart';
import '../../domain/entities/geo.dart';
import '../../domain/entities/document.dart';
import '../../domain/entities/vehicle.dart';
import '../../domain/entities/question.dart';
import '../../domain/entities/onboarding_progress.dart';
import '../../domain/repositories/onboarding_repository.dart';
import '../datasources/onboarding_remote_datasource.dart';

class OnboardingRepositoryImpl implements OnboardingRepository {
  final OnboardingRemoteDataSource remoteDataSource;

  OnboardingRepositoryImpl({required this.remoteDataSource});

  @override
  Future<DriverProfile> getProfile() async {
    final data = await remoteDataSource.getProfile();
    return DriverProfile.fromJson(data);
  }

  @override
  Future<DriverProfile> updateProfile({
    required String name,
    required String email,
    String? dob,
    String? gender,
    String? referralCode,
  }) async {
    final data = await remoteDataSource.updateProfile({
      'name': name,
      'email': email,
      if (dob != null) 'dateOfBirth': dob,
      if (gender != null) 'gender': gender,
      if (referralCode != null) 'referralCode': referralCode,
    });
    return DriverProfile.fromJson(data);
  }

  @override
  Future<OnboardingConfig> getOnboardingConfig() async {
    final data = await remoteDataSource.getOnboardingConfig();

    final List<Country> countries = (data['countries'] as List)
        .map((c) => Country.fromJson(c))
        .toList();

    final List<OnboardingQuestion> questionnaire =
        (data['questionnaire'] as List)
            .map((q) => OnboardingQuestion.fromJson(q))
            .toList();

    final List<DocumentType> docReqs = (data['documentRequirements'] as List)
        .map((d) => DocumentType.fromJson(d))
        .toList();

    final List<VehicleType> vehicleTypes = (data['vehicleTypes'] as List)
        .map((v) => VehicleType.fromJson(v))
        .toList();

    final legal = data['legalDocuments'] as Map?;
    final terms = legal?['terms'] as Map?;
    final privacy = legal?['privacyPolicy'] as Map?;

    return OnboardingConfig(
      countries: countries,
      questionnaire: questionnaire,
      documentRequirements: docReqs,
      vehicleTypes: vehicleTypes,
      termsUrl: terms?['contentUrl'],
      termsId: terms?['id'],
      privacyPolicyUrl: privacy?['contentUrl'],
      privacyPolicyId: privacy?['id'],
    );
  }

  @override
  Future<List<StateProvince>> getStates(String countryId) async {
    final list = await remoteDataSource.getStates(countryId);
    return list.map((s) => StateProvince.fromJson(s)).toList();
  }

  @override
  Future<List<City>> getCities(String stateId) async {
    final list = await remoteDataSource.getCities(stateId);
    return list.map((c) => City.fromJson(c)).toList();
  }

  @override
  Future<bool> setDrivingLocation({
    required String countryId,
    required String stateId,
    required String cityId,
  }) async {
    return await remoteDataSource.setDrivingLocation(
      countryId,
      stateId,
      cityId,
    );
  }

  @override
  Future<bool> acceptLegalDocument(String documentId) async {
    final res = await remoteDataSource.acceptLegalDocument(documentId);
    return res != null;
  }

  @override
  Future<List<DriverDocument>> getMyDocuments() async {
    final list = await remoteDataSource.getMyDocuments();
    return list.map((d) => DriverDocument.fromJson(d)).toList();
  }

  @override
  Future<UploadUrlResponse> requestUploadUrl(
    String documentTypeId,
    String side,
    String contentType,
  ) async {
    final res = await remoteDataSource.requestUploadUrl(
      documentTypeId,
      side,
      contentType,
    );
    return UploadUrlResponse(
      uploadUrl: res['uploadUrl'] ?? '',
      key: res['key'] ?? '',
    );
  }

  @override
  Future<bool> uploadDocumentFile(
    String uploadUrl,
    List<int> bytes,
    String contentType,
  ) async {
    return await remoteDataSource.uploadDocumentFile(
      uploadUrl,
      bytes,
      contentType,
    );
  }

  @override
  Future<DriverDocument> confirmDocument(
    String documentTypeId, {
    required String side,
    required String key,
    String? documentNumber,
    String? expiryDate,
  }) async {
    final data = await remoteDataSource.confirmDocument(
      documentTypeId,
      side,
      key,
      documentNumber: documentNumber,
      expiryDate: expiryDate,
    );
    return DriverDocument.fromJson(data);
  }

  @override
  Future<UploadUrlResponse> requestProfilePhotoUploadUrl(
    String contentType,
  ) async {
    final res = await remoteDataSource.requestProfilePhotoUploadUrl(
      contentType,
    );
    return UploadUrlResponse(
      uploadUrl: res['uploadUrl'] ?? '',
      key: res['key'] ?? '',
    );
  }

  @override
  Future<DriverProfile> confirmProfilePhoto(String key) async {
    final data = await remoteDataSource.confirmProfilePhoto(key);
    return DriverProfile.fromJson(data);
  }

  @override
  Future<List<DriverVehicle>> getMyVehicles() async {
    final list = await remoteDataSource.getMyVehicles();
    return list.map((v) => DriverVehicle.fromJson(v)).toList();
  }

  @override
  Future<DriverVehicle> addVehicle({
    required String vehicleTypeId,
    required String model,
    required String year,
    required String registrationNumber,
    String? color,
  }) async {
    String? resolvedModelId;
    try {
      final list = await remoteDataSource.getVehicleModels(vehicleTypeId: vehicleTypeId);
      if (list.isNotEmpty) {
        final query = model.toLowerCase();
        final matched = list.firstWhere(
          (m) {
            final name = (m['name'] as String?)?.toLowerCase() ?? '';
            final slug = (m['slug'] as String?)?.toLowerCase() ?? '';
            return name == query || slug.contains(query) || query.contains(name);
          },
          orElse: () => list.first,
        );
        resolvedModelId = matched['id']?.toString();
      }
    } catch (_) {
      // Fallback if /vehicle-models endpoint is unreachable
    }

    final data = await remoteDataSource.addVehicle({
      if (resolvedModelId != null) 'vehicleModelId': resolvedModelId,
      'vehicleTypeId': vehicleTypeId,
      'model': model,
      'year': year,
      'registrationNumber': registrationNumber,
      if (color != null) 'color': color,
    });
    return DriverVehicle.fromJson(data);
  }

  @override
  Future<List<DriverAnswer>> getMyAnswers() async {
    final list = await remoteDataSource.getMyAnswers();
    return list.map((a) => DriverAnswer.fromJson(a)).toList();
  }

  @override
  Future<bool> submitAnswers(List<Map<String, dynamic>> answers) async {
    return await remoteDataSource.submitAnswers(answers);
  }

  @override
  Future<RegistrationSummary> getRegistrationSummary() async {
    final data = await remoteDataSource.getRegistrationSummary();

    final driver = DriverProfile.fromJson(data['driver']);

    final List<DriverVehicle> vehicles = (data['vehicles'] as List)
        .map((v) => DriverVehicle.fromJson(v))
        .toList();

    final List<DriverDocument> documents = (data['documents'] as List)
        .map((d) => DriverDocument.fromJson(d))
        .toList();

    final List<DriverAnswer> answers = (data['answers'] as List)
        .map((a) => DriverAnswer.fromJson(a))
        .toList();

    return RegistrationSummary(
      driver: driver,
      vehicles: vehicles,
      documents: documents,
      answers: answers,
      isComplete: data['isComplete'] ?? false,
      missing:
          (data['missing'] as List?)?.map((m) => m.toString()).toList() ?? [],
    );
  }

  @override
  Future<DriverProfile> submitApplication() async {
    final data = await remoteDataSource.submitApplication();
    return DriverProfile.fromJson(data);
  }

  @override
  Future<OnboardingProgress> getOnboardingState() async {
    final data = await remoteDataSource.getOnboardingState();
    return OnboardingProgress.fromJson(data);
  }

  @override
  Future<bool> submitBankDetails({
    required String holder,
    required String bankName,
    required String accountNumber,
    required String ifscCode,
  }) async {
    final res = await remoteDataSource.submitBankDetails({
      'accountHolderName': holder,
      'bankName': bankName,
      'accountNumber': accountNumber,
      'routingCode': ifscCode,
    });
    return res.isNotEmpty;
  }

  @override
  Future<Map<String, dynamic>?> getMyBankDetails() {
    return remoteDataSource.getMyBankDetails();
  }

  @override
  Future<String> fetchLegalContent(String url) {
    return remoteDataSource.fetchLegalContent(url);
  }
}
