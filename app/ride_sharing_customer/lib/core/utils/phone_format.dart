/// Rider phones are E.164 for India (+91) or Canada (+1) — see the region lock.

const List<String> _dialCodes = ['+91', '+1'];

/// Splits '+919876543210' / '+91 9876543210' into ('+91', '9876543210').
/// Unknown formats come back as ('', input) so callers can still show something.
(String dialCode, String national) splitDialCode(String phone) {
  final compact = phone.replaceAll(RegExp(r'[\s\-()]'), '');
  for (final code in _dialCodes) {
    if (compact.startsWith(code)) return (code, compact.substring(code.length));
  }
  return ('', phone.trim());
}

/// Display form with a space after the country code: '+91 9876543210', '+1 4165550123'.
String formatPhoneDisplay(String phone) {
  final (dial, national) = splitDialCode(phone);
  return dial.isEmpty ? national : '$dial $national';
}
