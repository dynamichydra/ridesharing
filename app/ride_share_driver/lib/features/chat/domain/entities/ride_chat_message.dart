class RideChatMessage {
  final String id;
  final String rideId;
  final String senderId;
  final String senderRole; // 'rider' | 'driver' | 'system'
  final String messageType; // 'text' | 'predefined'
  final String content;
  final DateTime? readAt;
  final DateTime createdAt;

  RideChatMessage({
    required this.id,
    required this.rideId,
    required this.senderId,
    required this.senderRole,
    this.messageType = 'text',
    required this.content,
    this.readAt,
    required this.createdAt,
  });

  factory RideChatMessage.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic val) {
      if (val == null) return DateTime.now();
      if (val is DateTime) return val;
      return DateTime.tryParse(val.toString()) ?? DateTime.now();
    }

    return RideChatMessage(
      id: json['id']?.toString() ?? '',
      rideId: json['rideId']?.toString() ?? json['ride_id']?.toString() ?? '',
      senderId: json['senderId']?.toString() ?? json['sender_id']?.toString() ?? '',
      senderRole: json['senderRole']?.toString() ?? json['sender_role']?.toString() ?? 'system',
      messageType: json['messageType']?.toString() ?? json['message_type']?.toString() ?? 'text',
      content: json['content']?.toString() ?? '',
      readAt: json['readAt'] != null || json['read_at'] != null ? parseDate(json['readAt'] ?? json['read_at']) : null,
      createdAt: parseDate(json['createdAt'] ?? json['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'rideId': rideId,
    'senderId': senderId,
    'senderRole': senderRole,
    'messageType': messageType,
    'content': content,
    'readAt': readAt?.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
  };
}
