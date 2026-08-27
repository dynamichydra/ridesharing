import 'package:equatable/equatable.dart';

class DriverDocumentItem extends Equatable {
  final String documentTypeId;
  final String code;
  final String name;
  final String? description;
  final bool requiresFront;
  final bool requiresBack;
  final bool requiresPdf;
  final bool requiresExpiry;
  final bool requiresDocNumber;
  final String? id;
  final String? documentNumber;
  final String? frontUrl;
  final String? backUrl;
  final String? pdfUrl;
  final DateTime? expiryDate;
  final String status; // 'approved' | 'pending' | 'rejected' | 'missing'
  final String? rejectionReason;
  final DateTime? uploadedAt;
  final DateTime? verifiedAt;

  const DriverDocumentItem({
    required this.documentTypeId,
    required this.code,
    required this.name,
    this.description,
    this.requiresFront = true,
    this.requiresBack = false,
    this.requiresPdf = false,
    this.requiresExpiry = false,
    this.requiresDocNumber = false,
    this.id,
    this.documentNumber,
    this.frontUrl,
    this.backUrl,
    this.pdfUrl,
    this.expiryDate,
    required this.status,
    this.rejectionReason,
    this.uploadedAt,
    this.verifiedAt,
  });

  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isRejected => status.toLowerCase() == 'rejected';
  bool get isMissing => status.toLowerCase() == 'missing' || status.isEmpty;

  factory DriverDocumentItem.fromJson(Map<String, dynamic> json) {
    final expStr = json['expiryDate'] as String?;
    final upStr = json['uploadedAt'] as String?;
    final verStr = json['verifiedAt'] as String?;

    return DriverDocumentItem(
      documentTypeId: json['documentTypeId'] as String? ?? json['id'] as String? ?? '',
      code: json['code'] as String? ?? 'DOC',
      name: json['name'] as String? ?? (json['code'] as String? ?? 'Document').replaceAll('_', ' '),
      description: json['description'] as String?,
      requiresFront: json['requiresFront'] as bool? ?? true,
      requiresBack: json['requiresBack'] as bool? ?? false,
      requiresPdf: json['requiresPdf'] as bool? ?? false,
      requiresExpiry: json['requiresExpiry'] as bool? ?? false,
      requiresDocNumber: json['requiresDocNumber'] as bool? ?? false,
      id: json['id'] as String?,
      documentNumber: json['documentNumber'] as String?,
      frontUrl: json['frontUrl'] as String?,
      backUrl: json['backUrl'] as String?,
      pdfUrl: json['pdfUrl'] as String?,
      expiryDate: expStr != null ? DateTime.tryParse(expStr) : null,
      status: json['status'] as String? ?? 'missing',
      rejectionReason: json['rejectionReason'] as String?,
      uploadedAt: upStr != null ? DateTime.tryParse(upStr) : null,
      verifiedAt: verStr != null ? DateTime.tryParse(verStr) : null,
    );
  }

  @override
  List<Object?> get props => [
        documentTypeId,
        code,
        name,
        id,
        documentNumber,
        frontUrl,
        backUrl,
        expiryDate,
        status,
        rejectionReason,
      ];
}
