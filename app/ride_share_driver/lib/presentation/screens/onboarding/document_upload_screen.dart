import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/document.dart';
import '../../widgets/custom_toast.dart';

class DocumentUploadScreen extends StatefulWidget {
  final DocumentType docType;
  final DriverDocument? existingDoc;
  final Function({required String side, required String docNumber, String? expiryDate, required List<int> bytes, required String contentType}) onUpload;

  const DocumentUploadScreen({
    super.key,
    required this.docType,
    this.existingDoc,
    required this.onUpload,
  });

  @override
  State<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends State<DocumentUploadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _numController = TextEditingController();
  DateTime? _selectedExpiryDate;

  @override
  void initState() {
    super.initState();
    if (widget.existingDoc != null) {
      _numController.text = widget.existingDoc!.documentNumber ?? '';
      if (widget.existingDoc!.expiryDate != null) {
        _selectedExpiryDate = DateTime.tryParse(widget.existingDoc!.expiryDate!);
      }
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    debugPrint('[DocumentUploadScreen] Expiration date selector clicked');
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedExpiryDate ?? DateTime.now().add(const Duration(days: 365)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 15)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedExpiryDate) {
      debugPrint('[DocumentUploadScreen] Date selected: $picked');
      setState(() {
        _selectedExpiryDate = picked;
      });
    }
  }

  void _triggerSimulatedUpload(String side) {
    final numStr = _numController.text.trim();
    debugPrint('[DocumentUploadScreen] Upload clicked for side: $side. Doc number: $numStr');
    if (_formKey.currentState!.validate()) {
      if (widget.docType.requiresExpiry && _selectedExpiryDate == null) {
        debugPrint('[DocumentUploadScreen] Missing required expiration date');
        CustomToast.show(context, 'Please select an expiration date');
        return;
      }

      String? expiryString;
      if (_selectedExpiryDate != null) {
        expiryString = "${_selectedExpiryDate!.year}-${_selectedExpiryDate!.month.toString().padLeft(2, '0')}-${_selectedExpiryDate!.day.toString().padLeft(2, '0')}";
      }

      // Simulate file bytes for presigned url upload
      final List<int> simulatedBytes = List.filled(500, 0);

      debugPrint('[DocumentUploadScreen] Submitting upload: $side, docNumber: $numStr, expiry: $expiryString');
      widget.onUpload(
        side: side,
        docNumber: numStr,
        expiryDate: expiryString,
        bytes: simulatedBytes,
        contentType: 'image/jpeg',
      );
    } else {
      debugPrint('[DocumentUploadScreen] Validation failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    final expiryText = _selectedExpiryDate == null
        ? 'Select Expiration Date'
        : "${_selectedExpiryDate!.day.toString().padLeft(2, '0')}/${_selectedExpiryDate!.month.toString().padLeft(2, '0')}/${_selectedExpiryDate!.year}";

    final documentName = widget.docType.code.replaceAll('_', ' ');

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(24.0),
        children: [
          Text(
            'Upload $documentName',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            'Provide details and upload images of your driving license, vehicle registry, or identity cards.',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary.withOpacity(0.8)),
          ),
          const SizedBox(height: 32),
          if (widget.docType.requiresDocNumber) ...[
            TextFormField(
              controller: _numController,
              decoration: InputDecoration(
                labelText: '$documentName Document Number',
                hintText: 'e.g. DL-XXXXXXXXXXXXX or Aadhar UID',
              ),
              validator: (val) => val == null || val.isEmpty ? 'Document number is required' : null,
              onChanged: (val) => debugPrint('[DocumentUploadScreen] Document number changed: $val'),
            ),
            const SizedBox(height: 20),
          ],
          if (widget.docType.requiresExpiry) ...[
            InkWell(
              onTap: () => _selectDate(context),
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Expiry Date',
                  suffixIcon: Icon(Icons.calendar_today_rounded, color: AppColors.primary),
                ),
                child: Text(
                  expiryText,
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
          if (widget.existingDoc != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 24),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified_rounded, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Already Uploaded',
                          style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        Text(
                          'Status: ${widget.existingDoc!.status.toUpperCase()}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (widget.docType.requiresFront) ...[
            _buildUploadPlaceholder('Front Image / PDF Upload', 'front'),
            const SizedBox(height: 20),
          ],
          if (widget.docType.requiresBack) ...[
            _buildUploadPlaceholder('Back Image / PDF Upload', 'back'),
            const SizedBox(height: 20),
          ],
          if (widget.docType.requiresPdf && !widget.docType.requiresFront) ...[
            _buildUploadPlaceholder('Main Document PDF Upload', 'pdf'),
          ]
        ],
      ),
    );
  }

  Widget _buildUploadPlaceholder(String label, String side) {
    return InkWell(
      onTap: () {
        debugPrint('[DocumentUploadScreen] Upload Card tapped for side: $side');
        _triggerSimulatedUpload(side);
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 150,
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: AppColors.border, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_upload_rounded, size: 48, color: AppColors.primary),
            const SizedBox(height: 12),
            Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 4),
            const Text(
              'Supports PNG, JPG, PDF up to 10MB',
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
