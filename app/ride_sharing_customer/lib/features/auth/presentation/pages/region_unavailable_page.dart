import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../../core/region/region_guard.dart';
import '../../../../injection_container.dart';
import '../bloc/auth_bloc.dart';

/// Shown whenever the India/Canada region check fails — at launch, on resume, or when the
/// API rejects a request. Outside both countries it's a dead end ("not available"); for
/// fixable causes (VPN, fake GPS, no fix) it explains what to change and offers a re-check.
class RegionUnavailablePage extends StatefulWidget {
  final RegionResult? result;
  const RegionUnavailablePage({super.key, this.result});

  @override
  State<RegionUnavailablePage> createState() => _RegionUnavailablePageState();
}

class _RegionUnavailablePageState extends State<RegionUnavailablePage> {
  bool _checking = false;
  late RegionResult? _result = widget.result ?? sl<RegionGuard>().current;

  /// Travelling with an account from the other country: log out and sign in with an account
  /// from the country the rider is in now (the login page locks to that dial code).
  void _switchAccount() {
    context.read<AuthBloc>().add(LoggedOut());
    context.go('/login');
  }

  String get _localAccountLabel {
    final here = sl<RegionGuard>().current;
    if (here == null || !here.allowed) return 'Log in with another account';
    return here.countryCode == 'CA' ? 'Log in with a Canadian account' : 'Log in with an Indian account';
  }

  Future<void> _retry() async {
    setState(() => _checking = true);
    final result = await sl<RegionGuard>().verify();
    if (!mounted) return;
    if (result.allowed) {
      context.go('/'); // splash re-runs the normal start-up flow
      return;
    }
    if (result.needsLocationPermission) {
      await openAppSettings();
    }
    setState(() {
      _checking = false;
      _result = result;
    });
  }

  ({IconData icon, String title, String body}) get _copy {
    final r = _result;
    switch (r?.code) {
      case 'MOCK_LOCATION':
        return (
          icon: Icons.gps_off_rounded,
          title: 'Fake location detected',
          body: r?.message ?? 'Turn off any location-spoofing or mock-location app, then try again.',
        );
      case 'VPN_DETECTED':
      case 'NETWORK_LOCATION_MISMATCH':
        return (
          icon: Icons.vpn_lock_rounded,
          title: 'Turn off VPN or proxy',
          body: r?.message ?? 'Ryva cannot be used over a VPN or proxy. Turn it off and try again.',
        );
      case 'ACCOUNT_COUNTRY_MISMATCH':
        return (
          icon: Icons.public_off_rounded,
          title: 'Account not available here',
          body: r?.message ?? 'This account is registered in another country and can only be used there.',
        );
      case 'ACCOUNT_BLOCKED':
        return (
          icon: Icons.block_rounded,
          title: 'Account suspended',
          body: r?.message ?? 'This account has been suspended. Please contact support.',
        );
      case 'SESSION_UNVERIFIED':
        return (
          icon: Icons.cloud_off_rounded,
          title: 'Could not verify your account',
          body: r?.message ?? 'Check your internet connection and try again.',
        );
      case 'PHONE_COUNTRY_MISMATCH':
        return (
          icon: Icons.phone_disabled_rounded,
          title: 'Number not valid here',
          body: r?.message ?? 'Your account number does not belong to the country you are in.',
        );
      case 'LOCATION_PERMISSION':
        return (
          icon: Icons.location_off_rounded,
          title: 'Location required',
          body: r?.message ?? 'Allow location access and turn on GPS to use Ryva.',
        );
      case 'REGION_UNAVAILABLE':
        return (
          icon: Icons.public_off_rounded,
          title: 'Currently not available\nin your location',
          body: 'Ryva is available only in India and Canada right now. We hope to come to your city soon!',
        );
      default:
        return (
          icon: Icons.location_searching_rounded,
          title: 'Could not verify your location',
          body: r?.message ?? 'Check that GPS and internet are on, then try again.',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final copy = _copy;
    final isDeadEnd = _result?.isUnsupportedRegion ?? false;
    final isWrongCountryAccount = _result?.code == 'ACCOUNT_COUNTRY_MISMATCH';

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              children: [
                const Spacer(flex: 2),
                Image.asset(
                  'assets/logos/main-logo-full.png',
                  width: MediaQuery.of(context).size.width * 0.45,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
                const SizedBox(height: 40),
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: const Color(0xFF009048).withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(copy.icon, size: 44, color: const Color(0xFF009048)),
                ),
                const SizedBox(height: 24),
                Text(
                  copy.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0A2540), height: 1.3),
                ),
                const SizedBox(height: 12),
                Text(
                  copy.body,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.5),
                ),
                const Spacer(flex: 3),
                if (isWrongCountryAccount) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _switchAccount,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(_localAccountLabel, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _checking ? null : _retry,
                    child: const Text("I'm back home — check again", style: TextStyle(color: Color(0xFF64748B))),
                  ),
                ] else
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _checking ? null : _retry,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF009048),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _checking
                        ? const SizedBox(
                            width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : Text(
                            isDeadEnd ? 'Check again' : 'Try again',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
