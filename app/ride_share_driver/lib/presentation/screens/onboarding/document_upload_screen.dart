import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/document.dart';
import '../../../common/widgets/custom_toast.dart';

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

  bool get _isFullyUploaded {
    if (widget.existingDoc == null) return false;
    final doc = widget.existingDoc!;
    if (widget.docType.requiresFront && (doc.frontUrl == null || doc.frontUrl!.isEmpty)) {
      return false;
    }
    if (widget.docType.requiresBack && (doc.backUrl == null || doc.backUrl!.isEmpty)) {
      return false;
    }
    if (widget.docType.requiresPdf && (doc.pdfUrl == null || doc.pdfUrl!.isEmpty)) {
      return false;
    }
    return true;
  }

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
            useMaterial3: true,
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              secondary: AppColors.secondary,
              onSecondary: Colors.white,
              surface: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
            dialogTheme: DialogThemeData(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              elevation: 8,
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: AppColors.secondary,
                textStyle: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
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

    // Modern input decoration builder
    InputDecoration buildModernInputDecoration({
      required String labelText,
      required IconData prefixIcon,
      String? hintText,
      Widget? suffixIcon,
    }) {
      return InputDecoration(
        labelText: labelText,
        hintText: hintText,
        labelStyle: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 14,
        ),
        floatingLabelStyle: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
        ),
        prefixIcon: Icon(prefixIcon, color: AppColors.secondary, size: 22),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
      );
    }

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(24.0),
        physics: const BouncingScrollPhysics(),
        children: [
          Text(
            'Upload $documentName',
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Provide details and upload images of your driving license, vehicle registry, or identity cards.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),
          if (widget.docType.requiresDocNumber) ...[
            TextFormField(
              controller: _numController,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 16,
              ),
              decoration: buildModernInputDecoration(
                labelText: '$documentName Document Number',
                prefixIcon: Icons.badge_outlined,
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
                decoration: buildModernInputDecoration(
                  labelText: 'Expiry Date',
                  prefixIcon: Icons.calendar_today_outlined,
                ),
                child: Text(
                  expiryText,
                  style: TextStyle(
                    fontSize: 16,
                    color: _selectedExpiryDate == null
                        ? AppColors.textSecondary.withOpacity(0.8)
                        : AppColors.textPrimary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
          if (widget.existingDoc != null && _isFullyUploaded) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              margin: const EdgeInsets.only(bottom: 24),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.primary.withOpacity(0.2),
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.verified_rounded,
                    color: AppColors.primary,
                    size: 24,
                  ),
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
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Status: ${widget.existingDoc!.status.toUpperCase()}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
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
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hasLocalSelected) ...[
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
              child: _selectedContentTypes[side] == 'application/pdf'
                  ? Container(
                      height: 160,
                      color: AppColors.surface,
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
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: AppColors.textPrimary,
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
              padding: const EdgeInsets.all(16.0),
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
                        side: const BorderSide(
                          color: Colors.redAccent,
                          width: 1.5,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text(
                        'Clear',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _confirmUpload(side),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text(
                        'Confirm Upload',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else if (hasUploaded) ...[
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
              child: uploadedUrl.toLowerCase().contains('pdf')
                  ? Container(
                      height: 160,
                      color: AppColors.surface,
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.picture_as_pdf_rounded,
                            size: 48,
                            color: Colors.redAccent,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Uploaded Document (PDF)',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
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
                        color: AppColors.surface,
                        child: const Icon(
                          Icons.description_rounded,
                          size: 48,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.verified_rounded,
                    color: Colors.green,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Uploaded',
                    style: TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
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
              borderRadius: BorderRadius.circular(20),
              child: Container(
                height: 150,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.cloud_upload_rounded,
                      size: 44,
                      color: AppColors.secondary,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      label,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Supports PNG, JPG, PDF up to 10MB',
                      style: TextStyle(
                        fontSize: 12,
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
