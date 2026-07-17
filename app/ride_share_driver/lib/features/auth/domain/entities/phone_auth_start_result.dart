class PhoneAuthStartResult {
  final bool success;
  final bool isNewAccount;
  final String? error;

  const PhoneAuthStartResult({
    required this.success,
    required this.isNewAccount,
    this.error,
  });
}
