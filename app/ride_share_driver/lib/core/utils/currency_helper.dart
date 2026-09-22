class CurrencyHelper {
  static String getSymbol(String? currencyCode, {String? country}) {
    String code = (currencyCode == null || currencyCode.isEmpty) ? 'INR' : currencyCode.toUpperCase();
    
    // Fallback inference if the API failed to provide currency but we have country info
    if (country != null && (code == 'INR' || code.isEmpty)) {
      final c = country.toLowerCase();
      if (c == 'canada' || c == 'ca') code = 'CAD';
      else if (c == 'united states' || c == 'us' || c == 'usa') code = 'USD';
      else if (c == 'united kingdom' || c == 'uk' || c == 'gb') code = 'GBP';
      else if (c == 'australia' || c == 'au') code = 'AUD';
      else if (c == 'bangladesh' || c == 'bd') code = 'BDT';
    }

    switch (code) {
      case 'INR':
        return '₹';
      case 'USD':
      case 'CAD':
      case 'AUD':
      case 'NZD':
      case 'MXN':
      case 'SGD':
        return '\$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'BDT':
        return '৳';
      case 'BRL':
        return 'R\$';
      case 'JPY':
      case 'CNY':
        return '¥';
      default:
        return '\$';
    }
  }
}
