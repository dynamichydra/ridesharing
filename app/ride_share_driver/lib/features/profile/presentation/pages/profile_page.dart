import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/profile_bloc.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final ProfileBloc _bloc = di.sl<ProfileBloc>();

  @override
  void initState() {
    super.initState();
    _bloc.add(LoadProfile());
  }

  @override
  void dispose() {
    _bloc.close();
    super.dispose();
  }

  void _showPersonalDetailsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Personal Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Full Name', 'Ramesh Kumar'),
            const Divider(),
            _buildInfoRow('Phone', '+91 98765 43210'),
            const Divider(),
            _buildInfoRow('Email', 'ramesh.kumar@example.com'),
            const Divider(),
            _buildInfoRow('City', 'Bengaluru, India'),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF8A94A6), fontSize: 13)),
          Text(val, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47), fontSize: 14)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47), size: 26),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          title: const Text(
            'Profile',
            style: TextStyle(
              color: Color(0xFF021B47),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: Color(0xFF021B47), size: 22),
              onPressed: () => _showPersonalDetailsModal(context),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            children: [
              // 1. Driver Profile Header Card
              Center(
                child: Column(
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 40,
                          backgroundColor: const Color(0xFFF1F5F9),
                          child: const Icon(Icons.person, color: Color(0xFF021B47), size: 48),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Text(
                          'Ramesh Kumar',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                        Text(
                          ' 4.8',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF535E79)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      '+91 98765 43210',
                      style: TextStyle(fontSize: 13, color: Color(0xFF8A94A6)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // 2. Menu Navigation List
              _buildMenuItem(
                icon: Icons.person_outline_rounded,
                title: 'Personal Information',
                onTap: () => _showPersonalDetailsModal(context),
              ),
              _buildMenuItem(
                icon: Icons.description_outlined,
                title: 'Documents',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.two_wheeler_rounded,
                title: 'Vehicle Information',
                onTap: () => context.push('/vehicle-info'),
              ),
              _buildMenuItem(
                icon: Icons.account_balance_outlined,
                title: 'Bank Details',
                onTap: () => context.push('/wallet'),
              ),
              _buildMenuItem(
                icon: Icons.notifications_none_rounded,
                title: 'Notification Settings',
                onTap: () => context.push('/settings'),
              ),
              _buildMenuItem(
                icon: Icons.headset_mic_outlined,
                title: 'Support',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.lock_outline_rounded,
                title: 'Privacy Policy',
                onTap: () {},
              ),
              const SizedBox(height: 10),

              // Logout Action
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                leading: Container(
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFDE8E8),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.power_settings_new_rounded, color: Color(0xFFE53935), size: 20),
                ),
                title: const Text(
                  'Logout',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFFE53935)),
                ),
                onTap: () {
                  context.read<AuthBloc>().add(LogoutRequested());
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        leading: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: const Color(0xFF021B47), size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
        ),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF8A94A6)),
        onTap: onTap,
      ),
    );
  }
}
