class RideDisputeModel {
  final String id;
  final String rideId;
  final String reason;
  final String? description;
  final String status; // open, resolved, rejected
  final String? adminNotes;
  final String createdAt;

  RideDisputeModel({
    required this.id,
    required this.rideId,
    required this.reason,
    this.description,
    required this.status,
    this.adminNotes,
    required this.createdAt,
  });

  factory RideDisputeModel.fromJson(Map<String, dynamic> json) {
    return RideDisputeModel(
      id: json['id']?.toString() ?? '',
      rideId: json['rideId']?.toString() ?? '',
      reason: json['reason']?.toString() ?? 'fare_dispute',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'open',
      adminNotes: json['adminNotes']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}
