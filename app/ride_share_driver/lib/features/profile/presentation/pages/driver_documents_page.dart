import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/profile_bloc.dart';
import '../../data/models/driver_document_model.dart';
import '../../../../common/widgets/custom_toast.dart';

class DriverDocumentsPage extends StatefulWidget {
  const DriverDocumentsPage({super.key});

  @override
  State<DriverDocumentsPage> createState() => _DriverDocumentsPageState();
}

class _DriverDocumentsPageState extends State<DriverDocumentsPage> {
  late final ProfileBloc _bloc;

  @override
  void initState() {
    super.initState();
    _bloc = di.sl<ProfileBloc>()..add(LoadProfile());
  }

  void _showUploadDialog(BuildContext context, DriverDocumentItem doc) {
    final docNumCtrl = TextEditingController(text: doc.documentNumber ?? '');
    DateTime? selectedExpiry = doc.expiryDate;
    String side = 'front';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
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
                          fontSize: 18,
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
                const SizedBox(height: 16),

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
                      final picked = await showDatePicker(
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

                // Document Side (Front / Back)
                if (doc.requiresBack) ...[
                  const Text(
                    'Document Side',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('Front Side'),
                          selected: side == 'front',
                          onSelected: (val) => setModalState(() => side = 'front'),
                          selectedColor: const Color(0xFFDCFCE7),
                          labelStyle: TextStyle(
                            color: side == 'front' ? const Color(0xFF009048) : const Color(0xFF64748B),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('Back Side'),
                          selected: side == 'back',
                          onSelected: (val) => setModalState(() => side = 'back'),
                          selectedColor: const Color(0xFFDCFCE7),
                          labelStyle: TextStyle(
                            color: side == 'back' ? const Color(0xFF009048) : const Color(0xFF64748B),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
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
                    label: const Text(
                      'Submit Document for Verification',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    onPressed: () {
                      final docNum = docNumCtrl.text.trim();
                      if (docNum.isEmpty) {
                        CustomToast.show(context, 'Please enter the document number');
                        return;
                      }
                      Navigator.pop(ctx);
                      _bloc.add(UploadDriverDocument(
                        documentTypeId: doc.documentTypeId,
                        documentNumber: docNum,
                        expiryDate: selectedExpiry?.toIso8601String(),
                        side: side,
                      ));
                    },
                  ),
                ),
              ],
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
            'Documents Management',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 17,
            ),
          ),
          centerTitle: true,
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
                        : (state is ProfileLoading)
                            ? state.previousDocuments ?? []
                            : <DriverDocumentItem>[];

            final approvedCount = docs.where((d) => d.isApproved).length;
            final totalCount = docs.length;

            return RefreshIndicator(
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
                                      : 'Upload required documents to maintain active driver status.',
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
                      'Required Documents',
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
      badgeText = 'Upload Required';
      badgeIcon = Icons.upload_file_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
              'Number: ${doc.documentNumber}',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
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

          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 38,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: BorderSide(
                  color: doc.isApproved ? const Color(0xFFCBD5E1) : const Color(0xFF009048),
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: Icon(
                doc.isMissing ? Icons.upload_rounded : Icons.edit_document,
                size: 16,
                color: doc.isApproved ? const Color(0xFF64748B) : const Color(0xFF009048),
              ),
              label: Text(
                doc.isMissing
                    ? 'Upload Document'
                    : doc.isApproved
                        ? 'Update / Replace'
                        : 'Re-upload Document',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: doc.isApproved ? const Color(0xFF64748B) : const Color(0xFF009048),
                ),
              ),
              onPressed: () => _showUploadDialog(context, doc),
            ),
          ),
        ],
      ),
    );
  }
}
