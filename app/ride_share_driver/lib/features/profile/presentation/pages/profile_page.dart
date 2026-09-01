import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/profile_bloc.dart';
import '../../data/models/driver_document_model.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';
import '../../../../common/entities/driver_profile.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../common/widgets/app_date_picker.dart';

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

  void _showPersonalDetailsModal(BuildContext context, DriverProfile profile) {
    final nameCtrl = TextEditingController(text: profile.name ?? '');
    final emailCtrl = TextEditingController(text: profile.email ?? '');
    String? selectedGender = profile.gender;
    DateTime? selectedDob = profile.dateOfBirth != null ? DateTime.tryParse(profile.dateOfBirth!) : null;

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
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Edit Personal Information',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Full Name
                  const Text('Full Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      hintText: 'Enter your full name',
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

                  // Phone (read only)
                  const Text('Phone Number', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      profile.phone ?? 'Not registered',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Email
                  const Text('Email Address', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      hintText: 'Enter your email address',
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

                  // Gender & DOB Row
                  Row(
                    children: [
                      // Gender
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Gender', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: selectedGender,
                                  isExpanded: true,
                                  hint: const Text('Select', style: TextStyle(fontSize: 14, color: Color(0xFF94A3B8))),
                                  items: ['male', 'female', 'other'].map((g) {
                                    return DropdownMenuItem(
                                      value: g,
                                      child: Text(g[0].toUpperCase() + g.substring(1), style: const TextStyle(fontSize: 14, color: Color(0xFF0F172A))),
                                    );
                                  }).toList(),
                                  onChanged: (val) => setModalState(() => selectedGender = val),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Date of Birth
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Date of Birth', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () async {
                                final picked = await AppDatePicker.showCustomDatePicker(
                                  context: context,
                                  initialDate: selectedDob ?? DateTime(1995, 1, 1),
                                  firstDate: DateTime(1940),
                                  lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
                                );
                                if (picked != null) {
                                  setModalState(() => selectedDob = picked);
                                }
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      selectedDob != null
                                          ? '${selectedDob!.day}/${selectedDob!.month}/${selectedDob!.year}'
                                          : 'Select DOB',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: selectedDob != null ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                                      ),
                                    ),
                                    const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF64748B)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Save Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Save Personal Details',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      onPressed: () {
                        final name = nameCtrl.text.trim();
                        final email = emailCtrl.text.trim();
                        Navigator.pop(ctx);
                        _bloc.add(UpdateProfile(
                          name: name.isNotEmpty ? name : null,
                          email: email.isNotEmpty ? email : null,
                          gender: selectedGender,
                          dateOfBirth: selectedDob?.toIso8601String().split('T').first,
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
                  icon: const Icon(Icons.edit_outlined, color: Color(0xFF009048), size: 22),
                  onPressed: () => _showPersonalDetailsModal(context, profile),
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

            return RefreshIndicator(
              onRefresh: () async => _bloc.add(LoadProfile()),
              color: const Color(0xFF009048),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  children: [
                    // 1. Driver Profile Hero Card
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
                              CircleAvatar(
                                radius: 42,
                                backgroundColor: const Color(0xFFE6F4EA),
                                child: Text(
                                  _getInitials(driverName),
                                  style: const TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF009048),
                                  ),
                                ),
                              ),
                              Container(
                                width: 26,
                                height: 26,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF009048),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                                child: const Icon(Icons.check, color: Colors.white, size: 14),
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
                          if (profile?.cityName != null) ...[
                            const SizedBox(height: 2),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF94A3B8)),
                                const SizedBox(width: 2),
                                Text(
                                  '${profile!.cityName}, ${profile.countryName ?? 'India'}',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 2. Menu Options
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        children: [
                          _buildMenuItem(
                            icon: Icons.person_outline_rounded,
                            title: 'Personal Information',
                            subtitle: driverEmail,
                            onTap: () {
                              if (profile != null) _showPersonalDetailsModal(context, profile);
                            },
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
                            icon: Icons.account_balance_wallet_outlined,
                            title: 'Bank & Payout Account',
                            subtitle: 'Instant payout & earnings withdrawal',
                            onTap: () => context.go('/wallet'),
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
                    const SizedBox(height: 20),

                    // 3. Logout Action
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
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
                    const SizedBox(height: 24),
                  ],
                ),
              ),
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
