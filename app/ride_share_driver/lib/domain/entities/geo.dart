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
      id: json['id'],
      name: json['name'],
      isoCode: json['isoCode'],
      dialCode: json['dialCode'],
      currencyCode: json['currencyCode'],
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
      id: json['id'],
      countryId: json['countryId'],
      name: json['name'],
      code: json['code'] ?? '',
    );
  }
}

class City {
  final String id;
  final String stateId;
  final String countryId;
  final String name;

  City({
    required this.id,
    required this.stateId,
    required this.countryId,
    required this.name,
  });

  factory City.fromJson(Map<String, dynamic> json) {
    return City(
      id: json['id'],
      stateId: json['stateId'],
      countryId: json['countryId'],
      name: json['name'],
    );
  }
}
