import 'dart:async';
import 'package:flutter/material.dart';
import '../../domain/entities/ride_offer.dart';

class RideRequestCard extends StatefulWidget {
  final RideOffer offer;
  final Function(String rideId) onAccept;
  final Function(String rideId) onDecline;
  final Function(String rideId) onExpired;
  final bool isAccepting;

  const RideRequestCard({
    super.key,
    required this.offer,
    required this.onAccept,
    required this.onDecline,
    required this.onExpired,
    this.isAccepting = false,
  });

  @override
  State<RideRequestCard> createState() => _RideRequestCardState();
}

class _RideRequestCardState extends State<RideRequestCard>
    with SingleTickerProviderStateMixin {
  static const int _totalDuration = 30; // 30-second countdown
  Timer? _timer;
  late int _secondsLeft;

  late final AnimationController _dismissAnimController;
  late final Animation<Offset> _slideLeftAnim;
  late final Animation<double> _fadeAnim;
  bool _isDismissing = false;

  @override
  void initState() {
    super.initState();
    _secondsLeft = _calcInitialSeconds();

    _dismissAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );

    _slideLeftAnim =
        Tween<Offset>(begin: Offset.zero, end: const Offset(-1.2, 0.0)).animate(
          CurvedAnimation(
            parent: _dismissAnimController,
            curve: Curves.easeInOutCubic,
          ),
        );

    _fadeAnim = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _dismissAnimController, curve: Curves.easeIn),
    );

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _secondsLeft--;
        if (_secondsLeft <= 0) {
          _timer?.cancel();
          _triggerDismissAndExpire();
        }
      });
    });
  }

  void _triggerDismissAndExpire({bool isDecline = false}) {
    if (_isDismissing) return;
    _isDismissing = true;
    _timer?.cancel();
    _dismissAnimController.forward().then((_) {
      if (mounted) {
        if (isDecline) {
          widget.onDecline(widget.offer.rideId);
        } else {
          widget.onExpired(widget.offer.rideId);
        }
      }
    });
  }

  int _calcInitialSeconds() {
    if (widget.offer.expiresAt == null) return _totalDuration;
    final diff = widget.offer.expiresAt!.difference(DateTime.now()).inSeconds;
    return diff > 0
        ? (diff > _totalDuration ? _totalDuration : diff)
        : _totalDuration;
  }

  @override
  void dispose() {
    _timer?.cancel();
    _dismissAnimController.dispose();
    super.dispose();
  }

  String _formatTimer(int sec) {
    final s = sec.clamp(0, 99);
    return '00:${s.toString().padLeft(2, '0')}';
  }

  Map<String, String> _parseAddress(String? rawAddress, String fallbackTitle) {
    if (rawAddress == null || rawAddress.trim().isEmpty) {
      return {'title': fallbackTitle, 'subtitle': ''};
    }
    final parts = rawAddress
        .split(',')
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return {'title': fallbackTitle, 'subtitle': ''};
    if (parts.length == 1) return {'title': parts[0], 'subtitle': ''};
    if (parts.length == 2) return {'title': parts[0], 'subtitle': parts[1]};

    // When 3 or more parts: first 2 parts as title (head), remaining underneath as subtitle
    final title = '${parts[0]}, ${parts[1]}';
    final subtitle = parts.sublist(2).join(', ');
    return {'title': title, 'subtitle': subtitle};
  }

  @override
  Widget build(BuildContext context) {
    final offer = widget.offer;
    final progress = (_secondsLeft / _totalDuration).clamp(0.0, 1.0);

    // Calculate simulated times and distances if not explicitly provided
    final toPickupDist = offer.myDistanceKm > 0
        ? '${offer.myDistanceKm.toStringAsFixed(1)} km'
        : '2.4 km';
    final tripTime = offer.distanceKm > 0
        ? '${(offer.distanceKm * 2.5).round().clamp(5, 60)} min'
        : '15 min';
    final totalDist = offer.distanceKm > 0
        ? '${offer.distanceKm.toStringAsFixed(1)} km'
        : '6.5 km';

    final pickup = _parseAddress(offer.pickupAddress, 'Pickup Location');
    final dropoff = _parseAddress(offer.dropAddress, 'Drop Location');

    return SlideTransition(
      position: _slideLeftAnim,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: NEW Badge + Countdown Timer Ring
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(
                            color: Color(0xFF009048),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'NEW',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF009048),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          _formatTimer(_secondsLeft),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF009048),
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                        const SizedBox(width: 6),
                        SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            value: progress,
                            strokeWidth: 2,
                            backgroundColor: const Color(0xFFE2E8F0),
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              Color(0xFF009048),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Route details + Fare
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Origin & Destination points with dotted connector line
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Pickup Row
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Icon(
                                  Icons.circle,
                                  color: Color(0xFF009048),
                                  size: 10,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      pickup['title']!,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (pickup['subtitle']!.isNotEmpty) ...[
                                      const SizedBox(height: 1),
                                      Text(
                                        pickup['subtitle']!,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF64748B),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),

                          // Dotted Line
                          Padding(
                            padding: const EdgeInsets.only(
                              left: 4.5,
                              top: 2,
                              bottom: 2,
                            ),
                            child: SizedBox(
                              height: 16,
                              child: Column(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: List.generate(
                                  3,
                                  (index) => Container(
                                    width: 1.5,
                                    height: 2.5,
                                    color: const Color(0xFFCBD5E1),
                                  ),
                                ),
                              ),
                            ),
                          ),

                          // Drop-off Row
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Icon(
                                  Icons.location_on,
                                  color: Color(0xFFEF4444),
                                  size: 12,
                                ),
                              ),
                              const SizedBox(width: 7),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      dropoff['title']!,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (dropoff['subtitle']!.isNotEmpty) ...[
                                      const SizedBox(height: 1),
                                      Text(
                                        dropoff['subtitle']!,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF64748B),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Fare Display (₹ 125)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'FARE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF94A3B8),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '₹ ',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              offer.estimatedFare.toStringAsFixed(0),
                              style: const TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // 3-Metric Stats Row: [To pickup] [Trip time] [Total distance]
                Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: 8,
                    horizontal: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildMetricItem(
                          icon: Icons.navigation_outlined,
                          value: toPickupDist,
                          label: 'To pickup',
                        ),
                      ),
                      _buildMetricDivider(),
                      Expanded(
                        child: _buildMetricItem(
                          icon: Icons.access_time_rounded,
                          value: tripTime,
                          label: 'Trip time',
                        ),
                      ),
                      _buildMetricDivider(),
                      Expanded(
                        child: _buildMetricItem(
                          icon: Icons.route_outlined,
                          value: totalDist,
                          label: 'Total distance',
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Decline & Accept Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 42,
                        child: OutlinedButton(
                          onPressed: widget.isAccepting
                              ? null
                              : () => _triggerDismissAndExpire(isDecline: true),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFE53935),
                            side: const BorderSide(
                              color: Color(0xFFFCA5A5),
                              width: 1,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            padding: EdgeInsets.zero,
                          ),
                          child: const Text(
                            'Decline',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SizedBox(
                        height: 42,
                        child: ElevatedButton(
                          onPressed: widget.isAccepting
                              ? null
                              : () => widget.onAccept(offer.rideId),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF009048),
                            disabledBackgroundColor: const Color(0xFF009048).withValues(alpha: 0.7),
                            foregroundColor: Colors.white,
                            disabledForegroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            padding: EdgeInsets.zero,
                          ),
                          child: widget.isAccepting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text(
                                  'Accept',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
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

  Widget _buildMetricItem({
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 14, color: const Color(0xFF64748B)),
        const SizedBox(width: 5),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricDivider() {
    return Container(width: 1, height: 20, color: const Color(0xFFE2E8F0));
  }
}
