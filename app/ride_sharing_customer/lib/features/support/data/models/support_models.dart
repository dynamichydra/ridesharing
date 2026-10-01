class SupportCategoryModel {
  final String id;
  final String? parentId;
  final String targetRole;
  final String name;
  final String slug;
  final String? description;
  final String? iconUrl;
  final int displayOrder;
  final List<SupportCategoryModel> subcategories;

  SupportCategoryModel({
    required this.id,
    this.parentId,
    required this.targetRole,
    required this.name,
    required this.slug,
    this.description,
    this.iconUrl,
    required this.displayOrder,
    this.subcategories = const [],
  });

  factory SupportCategoryModel.fromJson(Map<String, dynamic> json) {
    return SupportCategoryModel(
      id: json['id']?.toString() ?? '',
      parentId: json['parentId']?.toString(),
      targetRole: json['targetRole']?.toString() ?? 'both',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      description: json['description']?.toString(),
      iconUrl: json['iconUrl']?.toString(),
      displayOrder: json['displayOrder'] is int ? json['displayOrder'] : 0,
      subcategories: (json['subcategories'] as List<dynamic>?)
              ?.map((e) => SupportCategoryModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class SupportFaqModel {
  final String id;
  final String categoryId;
  final String targetRole;
  final String question;
  final String answer;
  final int viewCount;
  final int helpfulYes;
  final int helpfulNo;

  SupportFaqModel({
    required this.id,
    required this.categoryId,
    required this.targetRole,
    required this.question,
    required this.answer,
    required this.viewCount,
    required this.helpfulYes,
    required this.helpfulNo,
  });

  factory SupportFaqModel.fromJson(Map<String, dynamic> json) {
    return SupportFaqModel(
      id: json['id']?.toString() ?? '',
      categoryId: json['categoryId']?.toString() ?? '',
      targetRole: json['targetRole']?.toString() ?? 'both',
      question: json['question']?.toString() ?? '',
      answer: json['answer']?.toString() ?? '',
      viewCount: json['viewCount'] is int ? json['viewCount'] : 0,
      helpfulYes: json['helpfulYes'] is int ? json['helpfulYes'] : 0,
      helpfulNo: json['helpfulNo'] is int ? json['helpfulNo'] : 0,
    );
  }
}

class SupportMessageModel {
  final String id;
  final String ticketId;
  final String senderType; // rider | driver | agent | bot | system
  final String? senderId;
  final String messageType;
  final String content;
  final bool isInternalNote;
  final bool isReadByUser;
  final DateTime createdAt;
  final List<String> attachments;

  SupportMessageModel({
    required this.id,
    required this.ticketId,
    required this.senderType,
    this.senderId,
    required this.messageType,
    required this.content,
    required this.isInternalNote,
    required this.isReadByUser,
    required this.createdAt,
    this.attachments = const [],
  });

  factory SupportMessageModel.fromJson(Map<String, dynamic> json) {
    List<String> attList = [];
    if (json['attachments'] is List) {
      for (var item in json['attachments']) {
        if (item is Map && item['fileUrl'] != null) {
          attList.add(item['fileUrl'].toString());
        } else if (item is String) {
          attList.add(item);
        }
      }
    }

    return SupportMessageModel(
      id: json['id']?.toString() ?? '',
      ticketId: json['ticketId']?.toString() ?? '',
      senderType: json['senderType']?.toString() ?? 'rider',
      senderId: json['senderId']?.toString(),
      messageType: json['messageType']?.toString() ?? 'text',
      content: json['content']?.toString() ?? '',
      isInternalNote: json['isInternalNote'] == true,
      isReadByUser: json['isReadByUser'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      attachments: attList,
    );
  }
}

class SupportTicketModel {
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
  final List<SupportMessageModel> messages;

  SupportTicketModel({
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

  factory SupportTicketModel.fromJson(Map<String, dynamic> json) {
    return SupportTicketModel(
      id: (json['id'] ?? json['ticketId'])?.toString() ?? '',
      ticketNumber: json['ticketNumber']?.toString() ?? '',
      userType: json['userType']?.toString() ?? 'rider',
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
              ?.map((e) => SupportMessageModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
