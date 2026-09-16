class RideReceiptModel {
  final String receiptId;
  final String rideId;
  final String? completedAt;
  final String pickupAddress;
  final String dropAddress;
  final double distanceKm;
  final int durationMin;
  final String currencyCode;
  final int totalFareMinor;
  final int baseFareMinor;
  final int distanceChargeMinor;
  final int timeChargeMinor;
  final int promoDiscountMinor;
  final String paymentMethod;
  final String? riderName;

  RideReceiptModel({
    required this.receiptId,
    required this.rideId,
    this.completedAt,
    required this.pickupAddress,
    required this.dropAddress,
    required this.distanceKm,
    required this.durationMin,
    required this.currencyCode,
    required this.totalFareMinor,
    required this.baseFareMinor,
    required this.distanceChargeMinor,
    required this.timeChargeMinor,
    required this.promoDiscountMinor,
    required this.paymentMethod,
    this.riderName,
  });

  static double _parseDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is num) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }

  static int _parseInt(dynamic val) {
    if (val == null) return 0;
    if (val is num) return val.toInt();
    return int.tryParse(val.toString()) ?? 0;
  }

  factory RideReceiptModel.fromJson(Map<String, dynamic> json) {
    final itemization = json['itemization'] as Map<String, dynamic>? ?? {};
    final rider = json['rider'] as Map<String, dynamic>?;

    return RideReceiptModel(
      receiptId: json['receiptId']?.toString() ?? 'REC-UNKNOWN',
      rideId: json['rideId']?.toString() ?? '',
      completedAt: json['completedAt']?.toString(),
      pickupAddress: json['pickupAddress']?.toString() ?? 'Pickup location',
      dropAddress: json['dropAddress']?.toString() ?? 'Drop location',
      distanceKm: _parseDouble(json['distanceKm']),
      durationMin: _parseInt(json['durationMin']),
      currencyCode: json['currencyCode']?.toString() ?? 'INR',
      totalFareMinor: _parseInt(itemization['finalFareMinor']),
      baseFareMinor: _parseInt(itemization['baseFareMinor']),
      distanceChargeMinor: _parseInt(itemization['distanceChargeMinor']),
      timeChargeMinor: _parseInt(itemization['timeChargeMinor']),
      promoDiscountMinor: _parseInt(itemization['promoDiscountMinor']),
      paymentMethod: json['paymentMethod']?.toString() ?? 'cash',
      riderName: rider?['name']?.toString(),
    );
  }
}
