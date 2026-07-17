/// Maps `GET /onboarding/state`. Named `OnboardingProgress` rather than
/// `OnboardingState` to avoid colliding with the Bloc state hierarchy of the
/// same name in `onboarding_bloc.dart`.
class OnboardingProgress {
  final String registrationStatus;
  final int registrationStep;
  final bool pendingLegalAcceptance;

  const OnboardingProgress({
    required this.registrationStatus,
    required this.registrationStep,
    required this.pendingLegalAcceptance,
  });

  factory OnboardingProgress.fromJson(Map<String, dynamic> json) {
    return OnboardingProgress(
      registrationStatus: json['registrationStatus'] as String? ?? 'new',
      registrationStep: json['registrationStep'] as int? ?? 0,
      pendingLegalAcceptance: json['pendingLegalAcceptance'] as bool? ?? false,
    );
  }
}
