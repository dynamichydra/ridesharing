import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../style/appcolors.dart';
import '../../domain/entities/ride_offer.dart';

/// Floating multi-request offer overlay tile.
/// Supports single or multiple stacked ride requests with interactive timer rings,
/// detailed trip information, fare badges, and accept/decline controls.
class RideOfferOverlay extends StatefulWidget {
  final List<RideOffer> offers;
  final Function(String rideId) onAccept;
  final Function(String rideId) onDecline;
  final Function(String rideId) onExpired;

  RideOfferOverlay({
    super.key,
    List<RideOffer>? offers,
    RideOffer? offer,
    required VoidCallback onAccept,
    required VoidCallback onDecline,
    required VoidCallback onExpired,
  })  : offers = offers ?? (offer != null ? [offer] : []),
        onAccept = ((id) => onAccept()),
        onDecline = ((id) => onDecline()),
        onExpired = ((id) => onExpired());

  const RideOfferOverlay.multi({
    super.key,
    required this.offers,
    required this.onAccept,
    required this.onDecline,
    required this.onExpired,
  });

  @override
  State<RideOfferOverlay> createState() => _RideOfferOverlayState();
}

class _RideOfferOverlayState extends State<RideOfferOverlay> {
  final PageController _pageController = PageController(viewportFraction: 0.94);
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.offers.isEmpty) return const SizedBox.shrink();

    return Material(
      color: Colors.black45,
      child: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (widget.offers.length > 1) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.notifications_active_rounded, color: Colors.amber, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        '${widget.offers.length} Pending Ride Requests',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            SizedBox(
              height: 380,
              child: PageView.builder(
                controller: _pageController,
                itemCount: widget.offers.length,
                onPageChanged: (idx) {
                  setState(() {
                    _currentPage = idx;
                  });
                },
                itemBuilder: (context, index) {
                  final offer = widget.offers[index];
                  return _SingleOfferTileCard(
                    key: ValueKey(offer.rideId),
                    offer: offer,
                    offerIndex: index + 1,
                    totalOffers: widget.offers.length,
                    onAccept: () => widget.onAccept(offer.rideId),
                    onDecline: () => widget.onDecline(offer.rideId),
                    onExpired: () => widget.onExpired(offer.rideId),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _SingleOfferTileCard extends StatefulWidget {
  final RideOffer offer;
  final int offerIndex;
  final int totalOffers;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onExpired;

  const _SingleOfferTileCard({
    super.key,
    required this.offer,
    required this.offerIndex,
    required this.totalOffers,
    required this.onAccept,
    required this.onDecline,
    required this.onExpired,
  });

  @override
  State<_SingleOfferTileCard> createState() => _SingleOfferTileCardState();
}

class _SingleOfferTileCardState extends State<_SingleOfferTileCard> {
  static const _fallbackSeconds = 25;
  Timer? _timer;
  late int _secondsLeft;

  @override
  void initState() {
    super.initState();
    _secondsLeft = _initialSecondsLeft();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
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
    final progress = (_secondsLeft / _fallbackSeconds).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Column(
          children: [
            // Top Countdown Progress Bar
            LinearProgressIndicator(
              value: progress,
              backgroundColor: const Color(0xFFE2E8F0),
              color: progress > 0.3 ? const Color(0xFF16A34A) : const Color(0xFFEF4444),
              minHeight: 4,
            ),

            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header Row: Request Badge & Timer Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                widget.totalOffers > 1
                                    ? 'Offer ${widget.offerIndex} of ${widget.totalOffers}'
                                    : 'New Ride Request',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF2563EB),
                                ),
                              ),
                            ),
                          ],
                        ),
                        _TimerRingBadge(secondsLeft: _secondsLeft),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Fare & Distance Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Estimated Fare',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${offer.currencyCode} ${offer.estimatedFare.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            _StatBadge(
                              icon: Icons.near_me_rounded,
                              label: '${offer.myDistanceKm.toStringAsFixed(1)} km away',
                              color: const Color(0xFF2563EB),
                              bgColor: const Color(0xFFEFF6FF),
                            ),
                            const SizedBox(width: 8),
                            _StatBadge(
                              icon: Icons.route_rounded,
                              label: '${offer.distanceKm.toStringAsFixed(1)} km trip',
                              color: const Color(0xFF16A34A),
                              bgColor: const Color(0xFFF0FDF4),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Pickup / Drop Route Connector Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        children: [
                          _TileAddressRow(
                            icon: Icons.trip_origin,
                            iconColor: const Color(0xFF16A34A),
                            title: 'PICKUP',
                            address: offer.pickupAddress ?? 'Pickup location',
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 4, horizontal: 10),
                            child: SizedBox(
                              height: 12,
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: VerticalDivider(color: Color(0xFFCBD5E1), width: 1),
                              ),
                            ),
                          ),
                          _TileAddressRow(
                            icon: Icons.location_on,
                            iconColor: const Color(0xFFEF4444),
                            title: 'DROP-OFF',
                            address: offer.dropAddress ?? 'Drop location',
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Accept / Decline Action Buttons Row
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: widget.onDecline,
                            icon: const Icon(Icons.close_rounded, size: 18),
                            label: const Text('Decline'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFEF4444),
                              side: const BorderSide(color: Color(0xFFFCA5A5)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: widget.onAccept,
                            icon: const Icon(Icons.check_circle_rounded, size: 20),
                            label: const Text('Accept Ride'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF16A34A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 0,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimerRingBadge extends StatelessWidget {
  final int secondsLeft;
  const _TimerRingBadge({required this.secondsLeft});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: secondsLeft <= 8 ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: secondsLeft <= 8 ? const Color(0xFFFCA5A5) : const Color(0xFFFDE68A),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.timer_outlined,
            size: 16,
            color: secondsLeft <= 8 ? const Color(0xFFDC2626) : const Color(0xDFD97706),
          ),
          const SizedBox(width: 4),
          Text(
            '${secondsLeft}s',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: secondsLeft <= 8 ? const Color(0xFFDC2626) : const Color(0xDFD97706),
            ),
          ),
        ],
      ),
    );
  }
}

class _TileAddressRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String address;

  const _TileAddressRow({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.address,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: iconColor,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                address,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color bgColor;

  const _StatBadge({
    required this.icon,
    required this.label,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
