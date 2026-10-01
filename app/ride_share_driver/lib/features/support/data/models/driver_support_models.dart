class DriverSupportCategoryModel {
  final String id;
  final String? parentId;
  final String targetRole;
  final String name;
  final String slug;
  final String? description;
  final int displayOrder;
  final List<DriverSupportCategoryModel> subcategories;

  DriverSupportCategoryModel({
    required this.id,
    this.parentId,
    required this.targetRole,
    required this.name,
    required this.slug,
    this.description,
    required this.displayOrder,
    this.subcategories = const [],
  });

  factory DriverSupportCategoryModel.fromJson(Map<String, dynamic> json) {
    return DriverSupportCategoryModel(
      id: json['id']?.toString() ?? '',
      parentId: json['parentId']?.toString(),
      targetRole: json['targetRole']?.toString() ?? 'driver',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      description: json['description']?.toString(),
      displayOrder: json['displayOrder'] is int ? json['displayOrder'] : 0,
      subcategories: (json['subcategories'] as List<dynamic>?)
              ?.map((e) => DriverSupportCategoryModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class DriverSupportFaqModel {
  final String id;
  final String categoryId;
  final String question;
  final String answer;
  final int viewCount;

  DriverSupportFaqModel({
    required this.id,
    required this.categoryId,
    required this.question,
    required this.answer,
    required this.viewCount,
  });

  factory DriverSupportFaqModel.fromJson(Map<String, dynamic> json) {
    return DriverSupportFaqModel(
      id: json['id']?.toString() ?? '',
      categoryId: json['categoryId']?.toString() ?? '',
      question: json['question']?.toString() ?? '',
      answer: json['answer']?.toString() ?? '',
      viewCount: json['viewCount'] is int ? json['viewCount'] : 0,
    );
  }
}

class DriverSupportMessageModel {
  final String id;
  final String ticketId;
  final String senderType;
  final String content;
  final bool isInternalNote;
  final DateTime createdAt;

  DriverSupportMessageModel({
    required this.id,
    required this.ticketId,
    required this.senderType,
    required this.content,
    required this.isInternalNote,
    required this.createdAt,
  });

  factory DriverSupportMessageModel.fromJson(Map<String, dynamic> json) {
    return DriverSupportMessageModel(
      id: json['id']?.toString() ?? '',
      ticketId: json['ticketId']?.toString() ?? '',
      senderType: json['senderType']?.toString() ?? 'driver',
      content: json['content']?.toString() ?? '',
      isInternalNote: json['isInternalNote'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class DriverSupportTicketModel {
  final String id;
  final String ticketNumber;
  final String userType;
  final String userId;
  final String categoryId;
  final String? categoryName;
  final String? rideId;
  final String subject;
  final String status;
  final String priority;
  final String? assignedAdminName;
  final DateTime slaDueAt;
  final bool slaBreached;
  final DateTime createdAt;
  final List<DriverSupportMessageModel> messages;

  DriverSupportTicketModel({
    required this.id,
    required this.ticketNumber,
    required this.userType,
    required this.userId,
    required this.categoryId,
    this.categoryName,
    this.rideId,
    required this.subject,
    required this.status,
    required this.priority,
    this.assignedAdminName,
    required this.slaDueAt,
    required this.slaBreached,
    required this.createdAt,
    this.messages = const [],
  });

  factory DriverSupportTicketModel.fromJson(Map<String, dynamic> json) {
    return DriverSupportTicketModel(
      id: (json['id'] ?? json['ticketId'])?.toString() ?? '',
      ticketNumber: json['ticketNumber']?.toString() ?? '',
      userType: json['userType']?.toString() ?? 'driver',
      userId: json['userId']?.toString() ?? '',
      categoryId: json['categoryId']?.toString() ?? '',
      categoryName: json['categoryName']?.toString() ?? json['category']?['name']?.toString(),
      rideId: json['rideId']?.toString(),
      subject: json['subject']?.toString() ?? '',
      status: json['status']?.toString() ?? 'open',
      priority: json['priority']?.toString() ?? 'medium',
      assignedAdminName: json['assignedAdminName']?.toString() ?? json['assignedAdmin']?['name']?.toString(),
      slaDueAt: json['slaDueAt'] != null
          ? DateTime.tryParse(json['slaDueAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      slaBreached: json['slaBreached'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      messages: (json['messages'] as List<dynamic>?)
              ?.map((e) => DriverSupportMessageModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
