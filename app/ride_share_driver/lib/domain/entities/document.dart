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
      id: json['id'],
      code: json['code'],
      requiresFront: json['requiresFront'] ?? true,
      requiresBack: json['requiresBack'] ?? false,
      requiresPdf: json['requiresPdf'] ?? false,
      requiresExpiry: json['requiresExpiry'] ?? true,
      requiresDocNumber: json['requiresDocNumber'] ?? true,
      isRequired: json['isRequired'] ?? true,
    );
  }
}

class DriverDocument {
  final String id;
  final String documentTypeId;
  final String? frontUrl;
  final String? backUrl;
  final String? pdfUrl;
  final String? documentNumber;
  final String? expiryDate;
  final String status; // pending | approved | rejected | expired
  final String? rejectionReason;

  DriverDocument({
    required this.id,
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
      id: json['id'],
      documentTypeId: json['documentTypeId'],
      frontUrl: json['frontUrl'],
      backUrl: json['backUrl'],
      pdfUrl: json['pdfUrl'],
      documentNumber: json['documentNumber'],
      expiryDate: json['expiryDate'],
      status: json['status'] ?? 'pending',
      rejectionReason: json['rejectionReason'],
    );
  }
}
