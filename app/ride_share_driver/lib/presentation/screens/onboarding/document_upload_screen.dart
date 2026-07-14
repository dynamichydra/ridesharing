import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/document.dart';
import '../../widgets/custom_toast.dart';

class DocumentUploadScreen extends StatefulWidget {
  final DocumentType docType;
  final DriverDocument? existingDoc;
  final Function({
    required String side,
    required String docNumber,
    String? expiryDate,
    required List<int> bytes,
    required String contentType,
  })
  onUpload;

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
        _selectedExpiryDate = DateTime.tryParse(
          widget.existingDoc!.expiryDate!,
        );
      }
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    debugPrint('[DocumentUploadScreen] Expiration date selector clicked');
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate:
          _selectedExpiryDate ?? DateTime.now().add(const Duration(days: 365)),
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

  Future<void> _showUploadSourceSheet(String side) async {
    if (!_formKey.currentState!.validate()) {
      debugPrint('[DocumentUploadScreen] Validation failed');
      return;
    }
    if (widget.docType.requiresExpiry && _selectedExpiryDate == null) {
      debugPrint('[DocumentUploadScreen] Missing required expiration date');
      CustomToast.show(context, 'Please select an expiration date');
      return;
    }

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Text(
                  'Select Upload Source',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              ListTile(
                leading: const Icon(
                  Icons.camera_alt_rounded,
                  color: AppColors.primary,
                ),
                title: const Text('Take Photo with Camera'),
                onTap: () {
                  Navigator.pop(context);
                  _processPick(side, ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(
                  Icons.photo_library_rounded,
                  color: AppColors.primary,
                ),
                title: const Text('Choose Photo from Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _processPick(side, ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(
                  Icons.picture_as_pdf_rounded,
                  color: AppColors.primary,
                ),
                title: const Text('Upload PDF / Document File'),
                onTap: () {
                  Navigator.pop(context);
                  _processFilePicker(side);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Future<void> _processPick(String side, ImageSource source) async {
    final numStr = _numController.text.trim();
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(
        source: source,
        maxWidth: 1500,
        maxHeight: 1500,
        imageQuality: 85,
      );

      if (file == null) {
        debugPrint('[DocumentUploadScreen] No image picked');
        return;
      }

      final bytes = await file.readAsBytes();
      String contentType = 'image/jpeg';
      final pathLower = file.path.toLowerCase();
      if (pathLower.endsWith('.png')) {
        contentType = 'image/png';
      }

      String? expiryString;
      if (_selectedExpiryDate != null) {
        expiryString =
            "${_selectedExpiryDate!.year}-${_selectedExpiryDate!.month.toString().padLeft(2, '0')}-${_selectedExpiryDate!.day.toString().padLeft(2, '0')}";
      }

      debugPrint(
        '[DocumentUploadScreen] Submitting image upload: $side, docNumber: $numStr, expiry: $expiryString, contentType: $contentType',
      );
      widget.onUpload(
        side: side,
        docNumber: numStr,
        expiryDate: expiryString,
        bytes: bytes,
        contentType: contentType,
      );
    } catch (e) {
      debugPrint('[DocumentUploadScreen] Error picking image: $e');
      if (mounted) {
        CustomToast.show(context, 'Failed to pick image: $e');
      }
    }
  }

  Future<void> _processFilePicker(String side) async {
    final numStr = _numController.text.trim();
    try {
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) {
        debugPrint('[DocumentUploadScreen] No file selected');
        return;
      }

      final file = result.files.first;
      List<int>? bytes = file.bytes;

      if (bytes == null && file.path != null) {
        final ioFile = File(file.path!);
        bytes = await ioFile.readAsBytes();
      }

      if (bytes == null) {
        debugPrint('[DocumentUploadScreen] Error: file bytes are null');
        if (mounted) {
          CustomToast.show(context, 'Could not read file data');
        }
        return;
      }

      String? expiryString;
      if (_selectedExpiryDate != null) {
        expiryString =
            "${_selectedExpiryDate!.year}-${_selectedExpiryDate!.month.toString().padLeft(2, '0')}-${_selectedExpiryDate!.day.toString().padLeft(2, '0')}";
      }

      String contentType = 'image/jpeg';
      final ext = file.extension?.toLowerCase();
      if (ext == 'pdf') {
        contentType = 'application/pdf';
      } else if (ext == 'png') {
        contentType = 'image/png';
      } else if (ext == 'jpg' || ext == 'jpeg') {
        contentType = 'image/jpeg';
      }

      debugPrint(
        '[DocumentUploadScreen] Submitting file upload: $side, docNumber: $numStr, expiry: $expiryString, contentType: $contentType',
      );
      widget.onUpload(
        side: side,
        docNumber: numStr,
        expiryDate: expiryString,
        bytes: bytes,
        contentType: contentType,
      );
    } catch (e) {
      debugPrint('[DocumentUploadScreen] Error picking file: $e');
      if (mounted) {
        CustomToast.show(context, 'Error selecting file');
      }
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
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Provide details and upload images of your driving license, vehicle registry, or identity cards.',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary.withOpacity(0.8),
            ),
          ),
          const SizedBox(height: 32),
          if (widget.docType.requiresDocNumber) ...[
            TextFormField(
              controller: _numController,
              decoration: InputDecoration(
                labelText: '$documentName Document Number',
                hintText: widget.docType.code == 'DRIVERS_LICENSE'
                    ? 'e.g. KA5120150123456'
                    : 'e.g. 12-digit Aadhar number',
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Document number is required';
                }
                final text = val.trim();
                if (widget.docType.code == 'DRIVERS_LICENSE') {
                  final cleanDL = text
                      .replaceAll(RegExp(r'[- ]'), '')
                      .toUpperCase();
                  if (!RegExp(
                    r'^[A-Z]{2}[0-9]{2}[0-9A-Z]{11}$',
                  ).hasMatch(cleanDL)) {
                    return 'Invalid DL format (e.g. KA5120150123456, 15 chars)';
                  }
                } else if (widget.docType.code == 'NATIONAL_ID') {
                  final cleanAadhar = text.replaceAll(RegExp(r'[- ]'), '');
                  if (!RegExp(r'^[0-9]{12}$').hasMatch(cleanAadhar)) {
                    return 'Invalid Aadhar format (must be exactly 12 digits)';
                  }
                }
                return null;
              },
              onChanged: (val) => debugPrint(
                '[DocumentUploadScreen] Document number changed: $val',
              ),
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
                  suffixIcon: Icon(
                    Icons.calendar_today_rounded,
                    color: AppColors.primary,
                  ),
                ),
                child: Text(expiryText, style: const TextStyle(fontSize: 16)),
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
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Status: ${widget.existingDoc!.status.toUpperCase()}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
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
          ],
        ],
      ),
    );
  }

  Widget _buildUploadPlaceholder(String label, String side) {
    return InkWell(
      onTap: () {
        debugPrint('[DocumentUploadScreen] Upload Card tapped for side: $side');
        _showUploadSourceSheet(side);
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
            const Icon(
              Icons.cloud_upload_rounded,
              size: 48,
              color: AppColors.primary,
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
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
