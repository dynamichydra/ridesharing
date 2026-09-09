import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../injection_container.dart' as di;
import '../../../../config/api_config.dart';
import '../bloc/profile_bloc.dart';
import '../../data/models/driver_document_model.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../common/widgets/app_date_picker.dart';

class DriverDocumentsPage extends StatefulWidget {
  const DriverDocumentsPage({super.key});

  @override
  State<DriverDocumentsPage> createState() => _DriverDocumentsPageState();
}

class _DriverDocumentsPageState extends State<DriverDocumentsPage> with WidgetsBindingObserver {
  late final ProfileBloc _bloc;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bloc = di.sl<ProfileBloc>()..add(LoadProfile());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _bloc.add(LoadProfile());
    }
  }

  String _formatUrl(String? keyOrUrl) {
    if (keyOrUrl == null || keyOrUrl.isEmpty) return '';
    if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
      return keyOrUrl;
    }
    return '${ApiConfig.baseUrl}/dev-storage/$keyOrUrl';
  }

  void _viewDocument({
    required BuildContext context,
    required String title,
    required String subtitle,
    required String? url,
    List<int>? localBytes,
    String? localPath,
  }) {
    final fullUrl = _formatUrl(url);
    final isPdf = (url != null && url.toLowerCase().contains('.pdf')) ||
        (localPath != null && localPath.toLowerCase().endsWith('.pdf'));

    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Color(0xFF1E293B),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (subtitle.isNotEmpty)
                          Text(
                            subtitle,
                            style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            // Viewer Container
            Flexible(
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.7,
                ),
                decoration: const BoxDecoration(
                  color: Color(0xFF0F172A),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: isPdf
                    ? Container(
                        padding: const EdgeInsets.all(32),
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.picture_as_pdf_rounded,
                              size: 72,
                              color: Colors.redAccent,
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'PDF Document File',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              url != null ? url.split('/').last : 'Document.pdf',
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 13,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                            ),
                          ],
                        ),
                      )
                    : InteractiveViewer(
                        minScale: 0.8,
                        maxScale: 4.0,
                        child: localBytes != null
                            ? Image.memory(
                                Uint8List.fromList(localBytes),
                                fit: BoxFit.contain,
                              )
                            : localPath != null
                                ? Image.file(
                                    File(localPath),
                                    fit: BoxFit.contain,
                                  )
                                : Image.network(
                                    fullUrl,
                                    fit: BoxFit.contain,
                                    loadingBuilder: (ctx, child, progress) {
                                      if (progress == null) return child;
                                      return const Center(
                                        child: CircularProgressIndicator(
                                          color: Color(0xFF009048),
                                        ),
                                      );
                                    },
                                    errorBuilder: (ctx, err, stack) => Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: const [
                                          Icon(Icons.broken_image_rounded, size: 54, color: Colors.white38),
                                          SizedBox(height: 12),
                                          Text(
                                            'Could not load preview image',
                                            style: TextStyle(color: Colors.white70),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showUploadDialog(BuildContext context, DriverDocumentItem doc, {String? targetSide}) {
    final docNumCtrl = TextEditingController(text: doc.documentNumber ?? '');
    DateTime? selectedExpiry = doc.expiryDate;

    // Detect if this document requires both sides or back side
    final hasBothSides = doc.requiresBack ||
        doc.code.toUpperCase().contains('LICENSE') ||
        doc.code.toUpperCase().contains('AADHAAR') ||
        doc.code.toUpperCase().contains('ID_CARD') ||
        (doc.backUrl != null && doc.backUrl!.isNotEmpty);

    String side = targetSide ?? 'front';
    if (!hasBothSides && doc.requiresPdf && !doc.requiresFront) {
      side = 'pdf';
    }

    List<int>? pickedBytes;
    String? pickedPath;
    String? pickedContentType;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> pickImage(ImageSource source) async {
            try {
              final picker = ImagePicker();
              final file = await picker.pickImage(
                source: source,
                maxWidth: 1600,
                maxHeight: 1600,
                imageQuality: 85,
              );
              if (file == null) return;
              final bytes = await file.readAsBytes();
              String cType = 'image/jpeg';
              if (file.path.toLowerCase().endsWith('.png')) cType = 'image/png';

              setModalState(() {
                pickedBytes = bytes;
                pickedPath = file.path;
                pickedContentType = cType;
              });
            } catch (e) {
              if (mounted) CustomToast.show(context, 'Failed to pick image: $e');
            }
          }

          Future<void> pickFile() async {
            try {
              final result = await FilePicker.pickFiles(
                type: FileType.custom,
                allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
                withData: true,
              );
              if (result == null || result.files.isEmpty) return;
              final file = result.files.first;
              List<int>? bytes = file.bytes;
              if (bytes == null && file.path != null) {
                bytes = await File(file.path!).readAsBytes();
              }
              if (bytes == null) {
                if (mounted) CustomToast.show(context, 'Could not read file data');
                return;
              }
              String cType = 'image/jpeg';
              final ext = file.extension?.toLowerCase();
              if (ext == 'pdf') {
                cType = 'application/pdf';
              } else if (ext == 'png') {
                cType = 'image/png';
              }

              setModalState(() {
                pickedBytes = bytes;
                pickedPath = file.path ?? file.name;
                pickedContentType = cType;
              });
            } catch (e) {
              if (mounted) CustomToast.show(context, 'Error picking file: $e');
            }
          }

          void showSourceOptions() {
            showModalBottomSheet(
              context: context,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder: (sheetCtx) => SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Text(
                        'Choose File Source',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.camera_alt_rounded, color: Color(0xFF009048)),
                      title: const Text('Take Photo with Camera'),
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        pickImage(ImageSource.camera);
                      },
                    ),
                    ListTile(
                      leading: const Icon(Icons.photo_library_rounded, color: Color(0xFF009048)),
                      title: const Text('Choose Photo from Gallery'),
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        pickImage(ImageSource.gallery);
                      },
                    ),
                    ListTile(
                      leading: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFF009048)),
                      title: const Text('Select PDF Document'),
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        pickFile();
                      },
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            );
          }

          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            padding: EdgeInsets.only(
              top: 20,
              left: 24,
              right: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Upload ${doc.name}',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Document Side Selector (Always shown if both sides supported or option available)
                  if (hasBothSides) ...[
                    const Text(
                      'Choose Side to Upload / Replace',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setModalState(() {
                                side = 'front';
                                pickedBytes = null;
                                pickedPath = null;
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: side == 'front' ? const Color(0xFFDCFCE7) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: side == 'front' ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                                  width: side == 'front' ? 1.5 : 1.0,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    doc.frontUrl != null ? Icons.check_circle_rounded : Icons.crop_portrait_rounded,
                                    size: 16,
                                    color: side == 'front' ? const Color(0xFF009048) : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Front Side',
                                    style: TextStyle(
                                      color: side == 'front' ? const Color(0xFF009048) : const Color(0xFF334155),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setModalState(() {
                                side = 'back';
                                pickedBytes = null;
                                pickedPath = null;
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: side == 'back' ? const Color(0xFFDCFCE7) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: side == 'back' ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                                  width: side == 'back' ? 1.5 : 1.0,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    doc.backUrl != null ? Icons.check_circle_rounded : Icons.flip_to_back_rounded,
                                    size: 16,
                                    color: side == 'back' ? const Color(0xFF009048) : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Back Side',
                                    style: TextStyle(
                                      color: side == 'back' ? const Color(0xFF009048) : const Color(0xFF334155),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Document Number Field
                  if (doc.requiresDocNumber || true) ...[
                    const Text(
                      'Document / Registration Number',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: docNumCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. DL-1420110012345',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF009048), width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Expiry Date Picker
                  if (doc.requiresExpiry) ...[
                    const Text(
                      'Expiry Date',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () async {
                        final picked = await AppDatePicker.showCustomDatePicker(
                          context: context,
                          initialDate: selectedExpiry ?? DateTime.now().add(const Duration(days: 365)),
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 365 * 20)),
                        );
                        if (picked != null) {
                          setModalState(() {
                            selectedExpiry = picked;
                          });
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              selectedExpiry != null
                                  ? '${selectedExpiry!.day}/${selectedExpiry!.month}/${selectedExpiry!.year}'
                                  : 'Select Expiry Date',
                              style: TextStyle(
                                fontSize: 14,
                                color: selectedExpiry != null ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                              ),
                            ),
                            const Icon(Icons.calendar_today_rounded, size: 18, color: Color(0xFF64748B)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // File Picker / Selected Preview
                  Text(
                    'Select ${side == "front" ? "Front" : side == "back" ? "Back" : "PDF"} File / Image',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 8),
                  if (pickedBytes != null && pickedPath != null) ...[
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF009048)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                            child: (pickedContentType == 'application/pdf')
                                ? Container(
                                    height: 110,
                                    color: const Color(0xFFFEF2F2),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.picture_as_pdf_rounded, size: 40, color: Colors.redAccent),
                                        const SizedBox(height: 6),
                                        Text(
                                          pickedPath!.split('/').last,
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                          maxLines: 1,
                                        ),
                                      ],
                                    ),
                                  )
                                : Image.file(
                                    File(pickedPath!),
                                    height: 130,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                  ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle_rounded, color: Color(0xFF009048), size: 18),
                                const SizedBox(width: 6),
                                Text(
                                  'Ready to Upload (${side.toUpperCase()})',
                                  style: const TextStyle(color: Color(0xFF009048), fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                                const Spacer(),
                                TextButton(
                                  onPressed: showSourceOptions,
                                  child: const Text('Change File', style: TextStyle(fontSize: 12)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ] else ...[
                    InkWell(
                      onTap: showSourceOptions,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.add_photo_alternate_rounded, color: Color(0xFF009048), size: 24),
                            const SizedBox(width: 8),
                            Text(
                              'Choose ${side == "front" ? "Front Side" : side == "back" ? "Back Side" : "Document"} Photo / PDF',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF009048),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Upload Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.cloud_upload_rounded, color: Colors.white, size: 20),
                      label: Text(
                        'Upload ${side == "front" ? "Front" : side == "back" ? "Back" : "PDF"} & Submit',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      onPressed: () {
                        final docNum = docNumCtrl.text.trim();
                        if (docNum.isEmpty) {
                          CustomToast.show(context, 'Please enter the document number');
                          return;
                        }
                        if (pickedBytes == null || pickedContentType == null) {
                          CustomToast.show(context, 'Please select a document image or file to upload');
                          return;
                        }

                        Navigator.pop(ctx);
                        _bloc.add(UploadDriverDocument(
                          documentTypeId: doc.documentTypeId,
                          documentNumber: docNum,
                          expiryDate: selectedExpiry?.toIso8601String(),
                          side: side,
                          bytes: pickedBytes!,
                          contentType: pickedContentType!,
                        ));
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text(
            'Documents & Verification',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 17,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Color(0xFF009048)),
              tooltip: 'Refresh Status',
              onPressed: () => _bloc.add(LoadProfile()),
            ),
          ],
        ),
        body: BlocConsumer<ProfileBloc, ProfileState>(
          listener: (context, state) {
            if (state is ProfileDocumentUploadSuccess) {
              CustomToast.show(context, state.message);
            } else if (state is ProfileError) {
              CustomToast.show(context, state.message);
            }
          },
          builder: (context, state) {
            final docs = (state is ProfileLoaded)
                ? state.documents
                : (state is ProfileUpdateSuccess)
                    ? state.documents
                    : (state is ProfileDocumentUploadSuccess)
                        ? state.documents
                        : (state is ProfileDocumentUploading)
                            ? state.documents
                            : (state is ProfileLoading)
                                ? state.previousDocuments ?? []
                                : <DriverDocumentItem>[];

            final approvedCount = docs.where((d) => d.isApproved).length;
            final totalCount = docs.length;

            return Stack(
              children: [
                RefreshIndicator(
                  onRefresh: () async => _bloc.add(LoadProfile()),
                  color: const Color(0xFF009048),
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Verification Overview Header Card
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 46,
                                height: 46,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF009048).withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.verified_user_rounded, color: Color(0xFF009048), size: 24),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      totalCount > 0 ? '$approvedCount of $totalCount Verified' : 'Document Verification',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      approvedCount == totalCount && totalCount > 0
                                          ? 'All required documents are approved and active.'
                                          : 'Upload both sides and keep documents up-to-date to maintain active driving status.',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        const Text(
                          'Your Documents',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 12),

                        if (docs.isEmpty && state is ProfileLoading) ...[
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(32),
                              child: CircularProgressIndicator(color: Color(0xFF009048)),
                            ),
                          ),
                        ] else if (docs.isEmpty) ...[
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Text(
                                'No documents found.',
                                style: TextStyle(color: Colors.grey[500]),
                              ),
                            ),
                          ),
                        ] else ...[
                          ...docs.map((doc) => _buildDocumentCard(context, doc)),
                        ],
                      ],
                    ),
                  ),
                ),
                if (state is ProfileDocumentUploading)
                  Container(
                    color: Colors.black38,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            CircularProgressIndicator(color: Color(0xFF009048), strokeWidth: 3),
                            SizedBox(width: 16),
                            Text(
                              'Uploading Document...',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildDocumentCard(BuildContext context, DriverDocumentItem doc) {
    Color badgeBg;
    Color badgeTextColor;
    String badgeText;
    IconData badgeIcon;

    if (doc.isApproved) {
      badgeBg = const Color(0xFFDCFCE7);
      badgeTextColor = const Color(0xFF15803D);
      badgeText = 'Approved';
      badgeIcon = Icons.check_circle_rounded;
    } else if (doc.isPending) {
      badgeBg = const Color(0xFFFEF3C7);
      badgeTextColor = const Color(0xFFB45309);
      badgeText = 'Under Review';
      badgeIcon = Icons.access_time_filled_rounded;
    } else if (doc.isRejected) {
      badgeBg = const Color(0xFFFEE2E2);
      badgeTextColor = const Color(0xFFB91C1C);
      badgeText = 'Rejected';
      badgeIcon = Icons.cancel_rounded;
    } else {
      badgeBg = const Color(0xFFF1F5F9);
      badgeTextColor = const Color(0xFF64748B);
      badgeText = 'Missing';
      badgeIcon = Icons.upload_file_rounded;
    }

    final hasBack = doc.backUrl != null && doc.backUrl!.isNotEmpty;

    // Detect if this document is two-sided
    final isTwoSided = doc.requiresBack ||
        doc.code.toUpperCase().contains('LICENSE') ||
        doc.code.toUpperCase().contains('AADHAAR') ||
        doc.code.toUpperCase().contains('ID_CARD') ||
        hasBack;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Name + Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  doc.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(badgeIcon, size: 13, color: badgeTextColor),
                    const SizedBox(width: 4),
                    Text(
                      badgeText,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: badgeTextColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (doc.documentNumber != null && doc.documentNumber!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Document No: ${doc.documentNumber}',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
            ),
          ],

          if (doc.expiryDate != null) ...[
            const SizedBox(height: 2),
            Text(
              'Expires: ${doc.expiryDate!.day}/${doc.expiryDate!.month}/${doc.expiryDate!.year}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],

          if (doc.rejectionReason != null && doc.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFFB91C1C)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Reason: ${doc.rejectionReason}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFFB91C1C)),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 14),

          // Two-sided layout: Front Side Card + Back Side Card
          if (isTwoSided) ...[
            Row(
              children: [
                // Front side slot
                Expanded(
                  child: _buildSideSlot(
                    context: context,
                    doc: doc,
                    sideLabel: 'Front Side',
                    url: doc.frontUrl,
                    side: 'front',
                  ),
                ),
                const SizedBox(width: 12),
                // Back side slot
                Expanded(
                  child: _buildSideSlot(
                    context: context,
                    doc: doc,
                    sideLabel: 'Back Side',
                    url: doc.backUrl,
                    side: 'back',
                  ),
                ),
              ],
            ),
          ] else ...[
            // Single slot (Front or PDF)
            _buildSideSlot(
              context: context,
              doc: doc,
              sideLabel: doc.requiresPdf ? 'Document File (PDF/Image)' : 'Document Photo',
              url: doc.frontUrl ?? doc.pdfUrl,
              side: doc.requiresPdf && !doc.requiresFront ? 'pdf' : 'front',
              isFullWidth: true,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSideSlot({
    required BuildContext context,
    required DriverDocumentItem doc,
    required String sideLabel,
    required String? url,
    required String side,
    bool isFullWidth = false,
  }) {
    final hasFile = url != null && url.isNotEmpty;
    final isPdf = (url != null && url.toLowerCase().contains('.pdf'));

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: hasFile ? const Color(0xFFE2E8F0) : const Color(0xFFCBD5E1),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header / Label banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: hasFile ? const Color(0xFFF1F5F9) : const Color(0xFFF1F5F9),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  sideLabel,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF334155),
                  ),
                ),
                Icon(
                  hasFile ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  size: 14,
                  color: hasFile ? const Color(0xFF009048) : const Color(0xFF94A3B8),
                ),
              ],
            ),
          ),

          // Thumbnail or Placeholder Area
          InkWell(
            onTap: () {
              if (hasFile) {
                _viewDocument(
                  context: context,
                  title: '${doc.name} ($sideLabel)',
                  subtitle: doc.documentNumber ?? '',
                  url: url,
                );
              } else {
                _showUploadDialog(context, doc, targetSide: side);
              }
            },
            child: SizedBox(
              height: isFullWidth ? 110 : 95,
              child: hasFile
                  ? Stack(
                      fit: StackFit.expand,
                      children: [
                        if (isPdf)
                          Container(
                            color: const Color(0xFFFEF2F2),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.picture_as_pdf_rounded, color: Colors.redAccent, size: 32),
                                SizedBox(height: 4),
                                Text('PDF File', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.redAccent)),
                              ],
                            ),
                          )
                        else
                          Image.network(
                            _formatUrl(url),
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => const Center(
                              child: Icon(Icons.image_not_supported_rounded, color: Colors.grey, size: 28),
                            ),
                          ),
                        // Zoom Overlay
                        Positioned(
                          top: 6,
                          right: 6,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.fullscreen_rounded, size: 14, color: Colors.white),
                          ),
                        ),
                      ],
                    )
                  : Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            side == 'back' ? Icons.flip_to_back_rounded : Icons.add_photo_alternate_rounded,
                            color: const Color(0xFF94A3B8),
                            size: 26,
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Tap to Upload',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
            ),
          ),

          // Action Buttons: View & Re-upload
          Container(
            padding: const EdgeInsets.all(6),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                if (hasFile) ...[
                  Expanded(
                    child: SizedBox(
                      height: 30,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () {
                          _viewDocument(
                            context: context,
                            title: '${doc.name} ($sideLabel)',
                            subtitle: doc.documentNumber ?? '',
                            url: url,
                          );
                        },
                        child: const Text('View', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: SizedBox(
                    height: 30,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _showUploadDialog(context, doc, targetSide: side),
                      child: Text(
                        hasFile ? 'Replace' : 'Upload',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
