class DocumentType {
  final String id;
  final String code;
  final bool requiresFront;
  final bool requiresBack;
  final bool requiresPdf;
  final bool requiresExpiry;
  final bool requiresDocNumber;
  final bool isRequired;

  DocumentType({
    required this.id,
    required this.code,
    required this.requiresFront,
    required this.requiresBack,
    required this.requiresPdf,
    required this.requiresExpiry,
    required this.requiresDocNumber,
    required this.isRequired,
  });

  factory DocumentType.fromJson(Map<String, dynamic> json) {
    return DocumentType(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      requiresFront: json['requiresFront'] as bool? ?? true,
      requiresBack: json['requiresBack'] as bool? ?? false,
      requiresPdf: json['requiresPdf'] as bool? ?? false,
      requiresExpiry: json['requiresExpiry'] as bool? ?? true,
      requiresDocNumber: json['requiresDocNumber'] as bool? ?? true,
      isRequired: json['isRequired'] as bool? ?? true,
    );
  }
}

class DriverDocument {
  final String? id;
  final String documentTypeId;
  final String? frontUrl;
  final String? backUrl;
  final String? pdfUrl;
  final String? documentNumber;
  final String? expiryDate;
  final String status; // pending | approved | rejected | expired | missing
  final String? rejectionReason;

  DriverDocument({
    this.id,
    required this.documentTypeId,
    this.frontUrl,
    this.backUrl,
    this.pdfUrl,
    this.documentNumber,
    this.expiryDate,
    required this.status,
    this.rejectionReason,
  });

  factory DriverDocument.fromJson(Map<String, dynamic> json) {
    return DriverDocument(
      id: json['id']?.toString(),
      documentTypeId: (json['documentTypeId'] ?? json['id'])?.toString() ?? '',
      frontUrl: json['frontUrl']?.toString(),
      backUrl: json['backUrl']?.toString(),
      pdfUrl: json['pdfUrl']?.toString(),
      documentNumber: json['documentNumber']?.toString(),
      expiryDate: json['expiryDate']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      rejectionReason: json['rejectionReason']?.toString(),
    );
  }
}

