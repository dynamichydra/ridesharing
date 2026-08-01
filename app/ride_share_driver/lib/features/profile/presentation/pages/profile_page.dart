import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../style/appcolors.dart';
import '../../../../injection_container.dart' as di;
import '../../../../common/widgets/custom_toast.dart';
import '../bloc/profile_bloc.dart';
import '../../../../common/entities/driver_profile.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final ProfileBloc _bloc = di.sl<ProfileBloc>();

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _dobCtrl = TextEditingController();
  String? _selectedGender;
  bool _editing = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _dobCtrl.dispose();
    _bloc.close();
    super.dispose();
  }

  void _populate(DriverProfile p) {
    _nameCtrl.text = p.name ?? '';
    _emailCtrl.text = p.email ?? '';
    _dobCtrl.text = p.dateOfBirth ?? '';
    _selectedGender = p.gender;
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc..add(LoadProfile()),
      child: BlocConsumer<ProfileBloc, ProfileState>(
        listener: (context, state) {
          if (state is ProfileLoaded && !_editing) _populate(state.profile);
          if (state is ProfileUpdateSuccess) {
            _editing = false;
            _populate(state.profile);
            CustomToast.show(context, 'Profile updated successfully!');
          }
          if (state is ProfileError) {
            CustomToast.show(context, state.message);
          }
        },
        builder: (context, state) {
          return Scaffold(
            backgroundColor: const Color(0xFFF8FAFC),
            appBar: AppBar(
              title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.bold)),
              backgroundColor: Colors.white,
              foregroundColor: AppColors.textPrimary,
              elevation: 0,
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(color: AppColors.border.withOpacity(0.4), height: 1),
              ),
              actions: [
                if (state is ProfileLoaded || state is ProfileUpdateSuccess)
                  TextButton(
                    onPressed: () {
                      if (_editing) {
                        _bloc.add(UpdateProfile(
                          name: _nameCtrl.text.trim(),
                          email: _emailCtrl.text.trim(),
                          dateOfBirth: _dobCtrl.text.trim(),
                          gender: _selectedGender,
                        ));
                      } else {
                        setState(() => _editing = true);
                      }
                    },
                    child: Text(_editing ? 'Save' : 'Edit',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                  ),
                if (state is ProfileUpdating)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: SizedBox(
                      width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
              ],
            ),
            body: () {
              if (state is ProfileLoading || state is ProfileInitial) {
                return const Center(child: CircularProgressIndicator());
              }
              if (state is ProfileError) {
                return Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                    const SizedBox(height: 12),
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: () => _bloc.add(LoadProfile()), child: const Text('Retry')),
                  ]),
                );
              }

              final DriverProfile profile;
              if (state is ProfileLoaded) profile = state.profile;
              else if (state is ProfileUpdateSuccess) profile = state.profile;
              else if (state is ProfileUpdating) profile = state.profile;
              else return const Center(child: CircularProgressIndicator());

              return SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Avatar header
                    Center(
                      child: Column(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [AppColors.secondary, AppColors.primary],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              boxShadow: [
                                BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 6)),
                              ],
                            ),
                            child: const CircleAvatar(
                              radius: 44,
                              backgroundColor: Colors.transparent,
                              child: Icon(Icons.person, color: Colors.white, size: 44),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            profile.name ?? 'Driver',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 4),
                          _statusBadge(profile.registrationStatus),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Stats row
                    Row(
                      children: [
                        _miniStat('Rating', '${profile.rating.toStringAsFixed(1)} ★', AppColors.primary),
                        const SizedBox(width: 12),
                        _miniStat('Status', _friendlyStatus(profile.registrationStatus), AppColors.secondary),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Form section
                    _sectionLabel('Personal Information'),
                    const SizedBox(height: 12),
                    _field('Full Name', _nameCtrl, enabled: _editing, icon: Icons.person_outline_rounded),
                    const SizedBox(height: 12),
                    _field('Email', _emailCtrl, enabled: _editing, icon: Icons.email_outlined, keyboardType: TextInputType.emailAddress),
                    const SizedBox(height: 12),
                    _field('Date of Birth (YYYY-MM-DD)', _dobCtrl, enabled: _editing, icon: Icons.cake_outlined),
                    const SizedBox(height: 12),

                    // Gender picker
                    _sectionLabel('Gender'),
                    const SizedBox(height: 8),
                    _editing
                        ? _genderPicker()
                        : _readonlyField(Icons.wc_rounded, _selectedGender ?? profile.gender ?? '—'),

                    const SizedBox(height: 24),
                    _sectionLabel('Account Info'),
                    const SizedBox(height: 12),
                    _readonlyField(Icons.phone_outlined, profile.phone ?? '—'),
                    const SizedBox(height: 8),
                    _readonlyField(Icons.badge_outlined, 'ID: ${profile.id.substring(0, 8)}...'),
                  ],
                ),
              );
            }(),
          );
        },
      ),
    );
  }

  Widget _sectionLabel(String label) => Text(label,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 0.5));

  Widget _miniStat(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.15)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 16, color: color, fontWeight: FontWeight.bold)),
        ]),
      ),
    );
  }

  Widget _field(String hint, TextEditingController ctrl, {
    bool enabled = true,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: ctrl,
      enabled: enabled,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, color: AppColors.textSecondary, size: 20),
        filled: true,
        fillColor: enabled ? Colors.white : const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.border.withOpacity(0.6)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.border.withOpacity(0.6)),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.border.withOpacity(0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
    );
  }

  Widget _readonlyField(IconData icon, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
      ),
      child: Row(children: [
        Icon(icon, color: AppColors.textSecondary, size: 20),
        const SizedBox(width: 12),
        Text(value, style: const TextStyle(color: AppColors.textPrimary, fontSize: 15)),
      ]),
    );
  }

  Widget _genderPicker() {
    return Row(
      children: ['male', 'female', 'other'].map((g) {
        final selected = _selectedGender == g;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _selectedGender = g),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: selected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: selected ? AppColors.primary : AppColors.border.withOpacity(0.5)),
              ),
              child: Center(
                child: Text(
                  g[0].toUpperCase() + g.substring(1),
                  style: TextStyle(
                    color: selected ? Colors.white : AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _statusBadge(String status) {
    Color color;
    String label;
    switch (status) {
      case 'approved': color = const Color(0xFF059669); label = 'Approved'; break;
      case 'pending_review': color = const Color(0xFFD97706); label = 'Under Review'; break;
      case 'rejected': color = const Color(0xFFDC2626); label = 'Rejected'; break;
      default: color = AppColors.textSecondary; label = status.replaceAll('_', ' ');
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }

  String _friendlyStatus(String s) {
    return switch (s) {
      'approved' => 'Approved',
      'pending_review' => 'Under Review',
      'registration_in_progress' => 'Registering',
      'rejected' => 'Rejected',
      _ => s,
    };
  }
}
