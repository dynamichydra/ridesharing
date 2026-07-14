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

  // Local picked state
  final Map<String, List<int>> _selectedBytes = {};
  final Map<String, String> _selectedPaths = {};
  final Map<String, String> _selectedContentTypes = {};

  // Uploaded state mirroring
  String? _uploadedFrontUrl;
  String? _uploadedBackUrl;
  String? _uploadedPdfUrl;

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
      _uploadedFrontUrl = widget.existingDoc!.frontUrl;
      _uploadedBackUrl = widget.existingDoc!.backUrl;
      _uploadedPdfUrl = widget.existingDoc!.pdfUrl;
    }
  }

  @override
  void didUpdateWidget(covariant DocumentUploadScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.existingDoc != oldWidget.existingDoc &&
        widget.existingDoc != null) {
      setState(() {
        _uploadedFrontUrl = widget.existingDoc!.frontUrl;
        _uploadedBackUrl = widget.existingDoc!.backUrl;
        _uploadedPdfUrl = widget.existingDoc!.pdfUrl;
      });
    }
  }

  String _getDownloadUrl(String key) {
    if (key.startsWith('http')) return key;
    return 'http://localhost:3000/api/v1/dev-storage/$key';
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

      setState(() {
        _selectedBytes[side] = bytes;
        _selectedPaths[side] = file.path;
        _selectedContentTypes[side] = contentType;
      });
    } catch (e) {
      debugPrint('[DocumentUploadScreen] Error picking image: $e');
      if (mounted) {
        CustomToast.show(context, 'Failed to pick image: $e');
      }
    }
  }

  Future<void> _processFilePicker(String side) async {
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

      String contentType = 'image/jpeg';
      final ext = file.extension?.toLowerCase();
      if (ext == 'pdf') {
        contentType = 'application/pdf';
      } else if (ext == 'png') {
        contentType = 'image/png';
      } else if (ext == 'jpg' || ext == 'jpeg') {
        contentType = 'image/jpeg';
      }

      setState(() {
        _selectedBytes[side] = bytes!;
        _selectedPaths[side] = file.path ?? file.name;
        _selectedContentTypes[side] = contentType;
      });
    } catch (e) {
      debugPrint('[DocumentUploadScreen] Error picking file: $e');
      if (mounted) {
        CustomToast.show(context, 'Error selecting file');
      }
    }
  }

  void _confirmUpload(String side) {
    if (!_formKey.currentState!.validate()) {
      debugPrint('[DocumentUploadScreen] Validation failed');
      return;
    }
    if (widget.docType.requiresExpiry && _selectedExpiryDate == null) {
      debugPrint('[DocumentUploadScreen] Missing required expiration date');
      CustomToast.show(context, 'Please select an expiration date');
      return;
    }

    final bytes = _selectedBytes[side];
    final contentType = _selectedContentTypes[side];
    if (bytes == null || contentType == null) return;

    final numStr = _numController.text.trim();
    String? expiryString;
    if (_selectedExpiryDate != null) {
      expiryString =
          "${_selectedExpiryDate!.year}-${_selectedExpiryDate!.month.toString().padLeft(2, '0')}-${_selectedExpiryDate!.day.toString().padLeft(2, '0')}";
    }

    debugPrint(
      '[DocumentUploadScreen] Confirming upload: $side, docNumber: $numStr, expiry: $expiryString, contentType: $contentType',
    );

    widget.onUpload(
      side: side,
      docNumber: numStr,
      expiryDate: expiryString,
      bytes: bytes,
      contentType: contentType,
    );

    setState(() {
      _selectedBytes.remove(side);
      _selectedPaths.remove(side);
      _selectedContentTypes.remove(side);

      // Keep temporary local UI state showing uploaded, until widget updates from repository
      if (side == 'front') {
        _uploadedFrontUrl = 'pending';
      } else if (side == 'back') {
        _uploadedBackUrl = 'pending';
      } else {
        _uploadedPdfUrl = 'pending';
      }
    });

    CustomToast.show(context, 'Document uploaded successfully');
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
            const SizedBox(height: 24),
          ],
          if (widget.docType.requiresBack) ...[
            _buildUploadPlaceholder('Back Image / PDF Upload', 'back'),
            const SizedBox(height: 24),
          ],
          if (widget.docType.requiresPdf && !widget.docType.requiresFront) ...[
            _buildUploadPlaceholder('Main Document PDF Upload', 'pdf'),
          ],
        ],
      ),
    );
  }

  Widget _buildUploadPlaceholder(String label, String side) {
    final hasLocalSelected = _selectedPaths[side] != null;
    final uploadedUrl = side == 'front'
        ? _uploadedFrontUrl
        : (side == 'back' ? _uploadedBackUrl : _uploadedPdfUrl);

    final hasUploaded = uploadedUrl != null && uploadedUrl.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hasLocalSelected) ...[
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              child: _selectedContentTypes[side] == 'application/pdf'
                  ? Container(
                      height: 160,
                      color: Colors.grey.shade50,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.picture_as_pdf_rounded,
                            size: 48,
                            color: Colors.redAccent,
                          ),
                          const SizedBox(height: 8),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              _selectedPaths[side]!.split('/').last,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    )
                  : Image.file(
                      File(_selectedPaths[side]!),
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _selectedBytes.remove(side);
                          _selectedPaths.remove(side);
                          _selectedContentTypes.remove(side);
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.redAccent,
                        side: const BorderSide(color: Colors.redAccent),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Clear'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _confirmUpload(side),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Confirm Upload'),
                    ),
                  ),
                ],
              ),
            ),
          ] else if (hasUploaded) ...[
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              child: uploadedUrl.toLowerCase().contains('pdf')
                  ? Container(
                      height: 160,
                      color: Colors.grey.shade50,
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.picture_as_pdf_rounded,
                            size: 48,
                            color: Colors.redAccent,
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Uploaded Document (PDF)',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    )
                  : Image.network(
                      _getDownloadUrl(uploadedUrl),
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        height: 160,
                        color: Colors.grey.shade100,
                        child: const Icon(
                          Icons.description_rounded,
                          size: 48,
                          color: Colors.grey,
                        ),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                children: [
                  const Icon(Icons.verified_rounded, color: Colors.green),
                  const SizedBox(width: 8),
                  const Text(
                    'Uploaded',
                    style: TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => _showUploadSourceSheet(side),
                    icon: const Icon(
                      Icons.sync_rounded,
                      size: 16,
                      color: AppColors.primary,
                    ),
                    label: const Text(
                      'Re-upload',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            InkWell(
              onTap: () => _showUploadSourceSheet(side),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                height: 150,
                alignment: Alignment.center,
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
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
