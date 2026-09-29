import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../injection_container.dart' as di;
import '../../../../config/api_config.dart';
import '../bloc/profile_bloc.dart';
import '../../data/models/driver_document_model.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';
import '../../../../common/entities/driver_profile.dart';
import '../../../../common/widgets/custom_toast.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final ProfileBloc _bloc;

  @override
  void initState() {
    super.initState();
    _bloc = di.sl<ProfileBloc>()..add(LoadProfile());
  }

  String _formatUrl(String? keyOrUrl) {
    if (keyOrUrl == null || keyOrUrl.isEmpty) return '';
    if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
      return keyOrUrl;
    }
    return '${ApiConfig.baseUrl}/dev-storage/$keyOrUrl';
  }

  void _showProfilePhotoOptions(BuildContext context, DriverProfile profile) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      backgroundColor: Colors.white,
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Profile Photo',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(
                    color: Color(0xFFE6F4EA),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF009048), size: 20),
                ),
                title: const Text('Take New Photo', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: const Text('Use your camera to capture photo', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  _pickAndUploadPhoto(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(
                    color: Color(0xFFE0F2FE),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: Color(0xFF0284C7), size: 20),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: const Text('Pick an existing picture from your device', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  _pickAndUploadPhoto(ImageSource.gallery);
                },
              ),
              if (profile.profilePhoto != null && profile.profilePhoto!.isNotEmpty)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF1F5F9),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.visibility_rounded, color: Color(0xFF334155), size: 20),
                  ),
                  title: const Text('View Current Photo', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  onTap: () {
                    Navigator.pop(sheetCtx);
                    _viewProfilePhoto(profile);
                  },
                ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUploadPhoto(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );
      if (file == null) return;

      final bytes = await file.readAsBytes();
      String cType = 'image/jpeg';
      if (file.path.toLowerCase().endsWith('.png')) cType = 'image/png';

      _bloc.add(UpdateProfilePhoto(bytes: bytes, contentType: cType));
    } catch (e) {
      if (mounted) CustomToast.show(context, 'Failed to pick profile photo: $e');
    }
  }

  void _viewProfilePhoto(DriverProfile profile) {
    final photoUrl = _formatUrl(profile.profilePhoto);
    if (photoUrl.isEmpty) return;

    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Align(
              alignment: Alignment.topRight,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: InteractiveViewer(
                minScale: 0.8,
                maxScale: 4.0,
                child: Image.network(
                  photoUrl,
                  fit: BoxFit.contain,
                  loadingBuilder: (ctx, child, progress) {
                    if (progress == null) return child;
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(color: Color(0xFF009048)),
                      ),
                    );
                  },
                  errorBuilder: (ctx, err, stack) => Container(
                    padding: const EdgeInsets.all(32),
                    color: const Color(0xFF1E293B),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.broken_image_rounded, size: 48, color: Colors.white38),
                        SizedBox(height: 12),
                        Text('Could not load photo preview', style: TextStyle(color: Colors.white70)),
                      ],
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



  String _getInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return 'DR';
    if (parts.length == 1) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
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
            icon: const Icon(Icons.menu_rounded, color: Color(0xFF0F172A), size: 26),
            onPressed: () => DriverMainLayout.openDrawer(),
          ),
          title: const Text(
            'Driver Profile',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 17,
            ),
          ),
          centerTitle: true,
          actions: [
            BlocBuilder<ProfileBloc, ProfileState>(
              builder: (context, state) {
                final profile = (state is ProfileLoaded)
                    ? state.profile
                    : (state is ProfileUpdateSuccess)
                        ? state.profile
                        : (state is ProfileLoading)
                            ? state.previousProfile
                            : null;
                if (profile == null) return const SizedBox.shrink();
                return IconButton(
                  icon: const Icon(Icons.edit_note_rounded, color: Color(0xFF009048), size: 26),
                  tooltip: 'Edit Profile',
                  onPressed: () => context.push('/edit-profile'),
                );
              },
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: BlocConsumer<ProfileBloc, ProfileState>(
          listener: (context, state) {
            if (state is ProfileUpdateSuccess) {
              CustomToast.show(context, state.message);
            } else if (state is ProfileError) {
              CustomToast.show(context, state.message);
            }
          },
          builder: (context, state) {
            final profile = (state is ProfileLoaded)
                ? state.profile
                : (state is ProfileUpdateSuccess)
                    ? state.profile
                    : (state is ProfileLoading)
                        ? state.previousProfile
                        : null;

            final docs = (state is ProfileLoaded)
                ? state.documents
                : (state is ProfileUpdateSuccess)
                    ? state.documents
                    : (state is ProfileLoading)
                        ? state.previousDocuments ?? []
                        : <DriverDocumentItem>[];

            final approvedDocsCount = docs.where((d) => d.isApproved).length;
            final totalDocsCount = docs.isNotEmpty ? docs.length : (profile?.totalDocuments ?? 0);

            final driverName = (profile?.name != null && profile!.name!.isNotEmpty)
                ? profile.name!
                : 'Registered Driver';
            final driverPhone = profile?.phone ?? 'Phone Not Set';
            final driverEmail = profile?.email ?? 'Email Not Set';
            final ratingStr = profile?.rating.toStringAsFixed(1) ?? '5.0';
            final vehicleStr = profile?.vehicleModel != null && profile?.vehicleNumber != null
                ? '${profile!.vehicleModel} • ${profile.vehicleNumber}'
                : (profile?.vehicleModel ?? profile?.vehicleNumber ?? 'Not Configured');

            final subPlanName = profile?.activeSubscriptionPlanName ?? 'No Active Plan';
            final hasSub = profile?.hasActiveSubscription ?? false;
            final photoUrl = _formatUrl(profile?.profilePhoto);

            return Stack(
              children: [
                RefreshIndicator(
                  onRefresh: () async => _bloc.add(LoadProfile()),
                  color: const Color(0xFF009048),
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Column(
                      children: [
                        // 1. Driver Profile Hero Card with Interactive Photo
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.03),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            children: [
                              Stack(
                                alignment: Alignment.bottomRight,
                                children: [
                                  InkWell(
                                    onTap: () {
                                      if (profile != null) _showProfilePhotoOptions(context, profile);
                                    },
                                    borderRadius: BorderRadius.circular(46),
                                    child: CircleAvatar(
                                      radius: 46,
                                      backgroundColor: const Color(0xFFE6F4EA),
                                      backgroundImage: photoUrl.isNotEmpty ? NetworkImage(photoUrl) : null,
                                      onBackgroundImageError: photoUrl.isNotEmpty
                                          ? (_, __) {}
                                          : null,
                                      child: photoUrl.isEmpty
                                          ? Text(
                                              _getInitials(driverName),
                                              style: const TextStyle(
                                                fontSize: 28,
                                                fontWeight: FontWeight.bold,
                                                color: Color(0xFF009048),
                                              ),
                                            )
                                          : null,
                                    ),
                                  ),
                                  // Edit Photo Camera Button Badge
                                  InkWell(
                                    onTap: () {
                                      if (profile != null) _showProfilePhotoOptions(context, profile);
                                    },
                                    child: Container(
                                      width: 30,
                                      height: 30,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF009048),
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.white, width: 2.5),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.15),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 15),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Flexible(
                                    child: Text(
                                      driverName,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF3C7),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.star_rounded, color: Color(0xFFD97706), size: 14),
                                        const SizedBox(width: 3),
                                        Text(
                                          ratingStr,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFFB45309),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                driverPhone,
                                style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                              ),
                              if (profile?.cityName != null || profile?.countryName != null) ...[
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF94A3B8)),
                                    const SizedBox(width: 2),
                                    Text(
                                      '${profile?.cityName ?? "City"}, ${profile?.countryName ?? "India"}',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                                    ),
                                  ],
                                ),
                              ],
                              const SizedBox(height: 14),
                              // Edit Profile & Photo Action Buttons Row
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: Color(0xFF009048)),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      ),
                                      icon: const Icon(Icons.edit_rounded, size: 15, color: Color(0xFF009048)),
                                      label: const Text(
                                        'Edit Profile',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                                      ),
                                      onPressed: () => context.push('/edit-profile'),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF009048),
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      ),
                                      icon: const Icon(Icons.camera_alt_outlined, size: 15, color: Colors.white),
                                      label: const Text(
                                        'Edit Photo',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                      onPressed: () {
                                        if (profile != null) _showProfilePhotoOptions(context, profile);
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                    // 2. Menu Options
                    Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      clipBehavior: Clip.antiAlias,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            _buildMenuItem(
                              icon: Icons.person_outline_rounded,
                              title: 'Personal Information',
                              subtitle: driverEmail,
                              onTap: () => context.push('/edit-profile'),
                            ),
                            const Divider(height: 1, color: Color(0xFFF1F5F9), indent: 56),
                            _buildMenuItem(
                              icon: Icons.description_outlined,
                              title: 'Documents Management',
                              subtitle: totalDocsCount > 0
                                  ? '$approvedDocsCount / $totalDocsCount verified'
                                  : 'Upload & verify license, RC, insurance',
                              trailingBadge: totalDocsCount > 0 && approvedDocsCount == totalDocsCount
                                  ? 'Verified'
                                  : 'Pending',
                              trailingBadgeColor: totalDocsCount > 0 && approvedDocsCount == totalDocsCount
                                  ? const Color(0xFF009048)
                                  : const Color(0xFFD97706),
                              onTap: () => context.push('/documents'),
                            ),
                            const Divider(height: 1, color: Color(0xFFF1F5F9), indent: 56),
                            _buildMenuItem(
                              icon: Icons.directions_car_filled_outlined,
                              title: 'Vehicle Information',
                              subtitle: vehicleStr,
                              onTap: () => context.push('/vehicle-info'),
                            ),
                            const Divider(height: 1, color: Color(0xFFF1F5F9), indent: 56),
                            _buildMenuItem(
                              icon: Icons.workspace_premium_outlined,
                              title: 'Subscription Management',
                              subtitle: subPlanName,
                              trailingBadge: hasSub ? 'Active' : 'Get Plan',
                              trailingBadgeColor: hasSub ? const Color(0xFF009048) : const Color(0xFF3B82F6),
                              onTap: () => context.push('/subscription'),
                            ),
                            const Divider(height: 1, color: Color(0xFFF1F5F9), indent: 56),
                            _buildMenuItem(
                              icon: Icons.account_balance_rounded,
                              title: 'Bank & Payout Account',
                              subtitle: 'Manage linked bank details & verification',
                              onTap: () => context.push('/bank-payout'),
                            ),
                            const Divider(height: 1, color: Color(0xFFF1F5F9), indent: 56),
                            _buildMenuItem(
                              icon: Icons.notifications_none_rounded,
                              title: 'Notification Settings',
                              subtitle: 'Push alerts & ride broadcasts',
                              onTap: () => context.push('/settings'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 3. Logout Action
                    Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      clipBehavior: Clip.antiAlias,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFFEE2E2)),
                        ),
                        child: ListTile(
                          leading: Container(
                            width: 38,
                            height: 38,
                            decoration: const BoxDecoration(
                              color: Color(0xFFFEE2E2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.logout_rounded, color: Color(0xFFDC2626), size: 20),
                          ),
                          title: const Text(
                            'Log Out',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFDC2626),
                            ),
                          ),
                          subtitle: const Text(
                            'Safely disconnect and sign out',
                            style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                          ),
                          trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFFDC2626)),
                          onTap: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                title: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold)),
                                content: const Text('Are you sure you want to log out? You will be set offline immediately.'),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                                  ),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFDC2626),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      elevation: 0,
                                    ),
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      context.read<AuthBloc>().add(LogoutRequested());
                                    },
                                    child: const Text('Log Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
            if (state is ProfilePhotoUploading || state is ProfileUpdating)
              Container(
                color: Colors.black45,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Color(0xFF009048), strokeWidth: 2.5),
                        ),
                        const SizedBox(width: 16),
                        Text(
                          state is ProfilePhotoUploading
                              ? 'Uploading Profile Photo...'
                              : 'Saving Profile Changes...',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
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

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    String? trailingBadge,
    Color? trailingBadgeColor,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: const Color(0xFF0F172A), size: 20),
      ),
      title: Text(
        title,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            )
          : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingBadge != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (trailingBadgeColor ?? const Color(0xFF009048)).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                trailingBadge,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: trailingBadgeColor ?? const Color(0xFF009048),
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF94A3B8)),
        ],
      ),
      onTap: onTap,
    );
  }
}
