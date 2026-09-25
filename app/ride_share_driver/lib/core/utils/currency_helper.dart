class CurrencyHelper {
  static String getSymbol(String? currencyCode, {String? country}) {
    String code = (currencyCode == null || currencyCode.isEmpty) ? '' : currencyCode.toUpperCase();
    
    // Fallback inference if currency is unpopulated but we have country info
    if (country != null && (code.isEmpty || code == 'INR' || code == 'CAD')) {
      final c = country.toLowerCase();
      if (c == 'canada' || c == 'ca') code = 'CAD';
      else if (c == 'india' || c == 'in') code = 'INR';
      else if (c == 'united states' || c == 'us' || c == 'usa') code = 'USD';
      else if (c == 'united kingdom' || c == 'uk' || c == 'gb') code = 'GBP';
      else if (c == 'australia' || c == 'au') code = 'AUD';
      else if (c == 'bangladesh' || c == 'bd') code = 'BDT';
    }

    if (code.isEmpty) return '';

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
        return '';
    }
  }
}
