import 'dart:async';
import 'package:flutter/material.dart';
import '../../domain/entities/ride_offer.dart';

class RideRequestCard extends StatefulWidget {
  final RideOffer offer;
  final Function(String rideId) onAccept;
  final Function(String rideId) onDecline;
  final Function(String rideId) onExpired;

  const RideRequestCard({
    super.key,
    required this.offer,
    required this.onAccept,
    required this.onDecline,
    required this.onExpired,
  });

  @override
  State<RideRequestCard> createState() => _RideRequestCardState();
}

class _RideRequestCardState extends State<RideRequestCard> {
  static const int _totalDuration = 30; // 30-second countdown
  Timer? _timer;
  late int _secondsLeft;

  @override
  void initState() {
    super.initState();
    _secondsLeft = _calcInitialSeconds();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _secondsLeft--;
        if (_secondsLeft <= 0) {
          _timer?.cancel();
          widget.onExpired(widget.offer.rideId);
        }
      });
    });
  }

  int _calcInitialSeconds() {
    if (widget.offer.expiresAt == null) return _totalDuration;
    final diff = widget.offer.expiresAt!.difference(DateTime.now()).inSeconds;
    return diff > 0 ? (diff > _totalDuration ? _totalDuration : diff) : _totalDuration;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatTimer(int sec) {
    final s = sec.clamp(0, 99);
    return '00:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final offer = widget.offer;
    final progress = (_secondsLeft / _totalDuration).clamp(0.0, 1.0);

    // Calculate simulated times and distances if not explicitly provided
    final toPickupDist = offer.myDistanceKm > 0 ? '${offer.myDistanceKm.toStringAsFixed(1)} km' : '2.4 km';
    final tripTime = offer.distanceKm > 0 ? '${(offer.distanceKm * 2.5).round().clamp(5, 60)} min' : '15 min';
    final totalDist = offer.distanceKm > 0 ? '${offer.distanceKm.toStringAsFixed(1)} km' : '6.5 km';

    return Container(
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
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF009048)),
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
                            child: Icon(Icons.circle, color: Color(0xFF009048), size: 10),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _getMainTitle(offer.pickupAddress, 'Pickup Location'),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  _getSubTitle(offer.pickupAddress, 'Nearby Landmark'),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      // Dotted Line
                      Padding(
                        padding: const EdgeInsets.only(left: 4.5, top: 2, bottom: 2),
                        child: SizedBox(
                          height: 16,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                            child: Icon(Icons.location_on, color: Color(0xFFEF4444), size: 12),
                          ),
                          const SizedBox(width: 7),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _getMainTitle(offer.dropAddress, 'Drop Location'),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  _getSubTitle(offer.dropAddress, 'Destination details'),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
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
                            height: 1.0,
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
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
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
                      onPressed: () => widget.onDecline(offer.rideId),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFE53935),
                        side: const BorderSide(color: Color(0xFFFCA5A5), width: 1),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: EdgeInsets.zero,
                      ),
                      child: const Text(
                        'Decline',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 42,
                    child: ElevatedButton(
                      onPressed: () => widget.onAccept(offer.rideId),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: EdgeInsets.zero,
                      ),
                      child: const Text(
                        'Accept',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
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
              style: const TextStyle(
                fontSize: 9,
                color: Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricDivider() {
    return Container(
      width: 1,
      height: 20,
      color: const Color(0xFFE2E8F0),
    );
  }

  String _getMainTitle(String? fullAddress, String fallback) {
    if (fullAddress == null || fullAddress.trim().isEmpty) return fallback;
    final parts = fullAddress.split(',');
    if (parts.isNotEmpty) return parts.first.trim();
    return fullAddress;
  }

  String _getSubTitle(String? fullAddress, String fallback) {
    if (fullAddress == null || fullAddress.trim().isEmpty) return fallback;
    final parts = fullAddress.split(',');
    if (parts.length > 1) {
      return parts.sublist(1).join(',').trim();
    }
    return fullAddress;
  }
}
