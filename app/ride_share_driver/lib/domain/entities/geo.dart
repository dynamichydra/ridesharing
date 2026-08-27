class Country {
  final String id;
  final String name;
  final String isoCode;
  final String dialCode;
  final String currencyCode;

  Country({
    required this.id,
    required this.name,
    required this.isoCode,
    required this.dialCode,
    required this.currencyCode,
  });

  factory Country.fromJson(Map<String, dynamic> json) {
    return Country(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      isoCode: json['isoCode']?.toString() ?? '',
      dialCode: json['dialCode']?.toString() ?? '',
      currencyCode: json['currencyCode']?.toString() ?? '',
    );
  }
}

class StateProvince {
  final String id;
  final String countryId;
  final String name;
  final String code;

  StateProvince({
    required this.id,
    required this.countryId,
    required this.name,
    required this.code,
  });

  factory StateProvince.fromJson(Map<String, dynamic> json) {
    return StateProvince(
      id: json['id']?.toString() ?? '',
      countryId: json['countryId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
    );
  }
}

class City {
  final String id;
  final String stateId;
  final String? countryId;
  final String name;

  City({
    required this.id,
    required this.stateId,
    this.countryId,
    required this.name,
  });

  factory City.fromJson(Map<String, dynamic> json) {
    return City(
      id: json['id']?.toString() ?? '',
      stateId: json['stateId']?.toString() ?? '',
      countryId: json['countryId']?.toString(),
      name: json['name']?.toString() ?? '',
    );
  }
}

