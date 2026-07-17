import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../style/appcolors.dart';
import '../../domain/entities/ride_offer.dart';

/// Non-dismissible full-screen overlay for an incoming ride offer — no
/// swipe-to-dismiss/tap-outside, since an offer needs an explicit
/// accept/decline, not an accidental one.
///
/// The backend doesn't push an "offer expired" event (confirmed against
/// `backend/src/sockets/index.js` and the Kafka bridge) — the matching ring
/// timeout (~25s, per the fare/matching design) is enforced server-side, but
/// the client has to time out the *offer card* itself, hence the local
/// countdown here.
class RideOfferOverlay extends StatefulWidget {
  final RideOffer offer;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onExpired;

  const RideOfferOverlay({
    super.key,
    required this.offer,
    required this.onAccept,
    required this.onDecline,
    required this.onExpired,
  });

  @override
  State<RideOfferOverlay> createState() => _RideOfferOverlayState();
}

class _RideOfferOverlayState extends State<RideOfferOverlay> {
  static const _fallbackSeconds = 25;

  Timer? _timer;
  late int _secondsLeft;

  @override
  void initState() {
    super.initState();
    _secondsLeft = _initialSecondsLeft();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _secondsLeft--;
        if (_secondsLeft <= 0) {
          _timer?.cancel();
          widget.onExpired();
        }
      });
    });
  }

  int _initialSecondsLeft() {
    final expiresAt = widget.offer.expiresAt;
    if (expiresAt == null) return _fallbackSeconds;
    final diff = expiresAt.difference(DateTime.now()).inSeconds;
    return diff > 0 ? diff : _fallbackSeconds;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final offer = widget.offer;
    return Material(
      color: Colors.black54,
      child: SafeArea(
        child: Center(
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'New Ride Request',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    _CountdownBadge(secondsLeft: _secondsLeft),
                  ],
                ),
                const SizedBox(height: 16),
                _AddressRow(icon: Icons.trip_origin, color: AppColors.primary, label: offer.pickupAddress ?? 'Pickup location'),
                const SizedBox(height: 8),
                _AddressRow(icon: Icons.location_on, color: AppColors.error, label: offer.dropAddress ?? 'Drop location'),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _StatChip(label: '${offer.myDistanceKm.toStringAsFixed(1)} km away'),
                    _StatChip(label: '${offer.distanceKm.toStringAsFixed(1)} km trip'),
                    _StatChip(label: '${offer.currencyCode} ${offer.estimatedFare.toStringAsFixed(2)}'),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: widget.onDecline,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.error,
                          side: const BorderSide(color: AppColors.error),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Decline'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: widget.onAccept,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: const Text('Accept'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CountdownBadge extends StatelessWidget {
  final int secondsLeft;
  const _CountdownBadge({required this.secondsLeft});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '${secondsLeft}s',
        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
      ),
    );
  }
}

class _AddressRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  const _AddressRow({required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
        ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  const _StatChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
    );
  }
}
