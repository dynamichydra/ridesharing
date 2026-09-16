class LostItemModel {
  final String id;
  final String rideId;
  final String itemName;
  final String? description;
  final String status; // reported, found, returned, closed
  final String createdAt;

  LostItemModel({
    required this.id,
    required this.rideId,
    required this.itemName,
    this.description,
    required this.status,
    required this.createdAt,
  });

  factory LostItemModel.fromJson(Map<String, dynamic> json) {
    return LostItemModel(
      id: json['id']?.toString() ?? '',
      rideId: json['rideId']?.toString() ?? '',
      itemName: json['itemName']?.toString() ?? json['itemCategory']?.toString() ?? 'Item',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'reported',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}
