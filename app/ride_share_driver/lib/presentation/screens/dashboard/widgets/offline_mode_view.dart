import 'package:flutter/material.dart';

class OfflineModeView extends StatefulWidget {
  final VoidCallback onGoOnline;
  final bool isGoingOnline;

  const OfflineModeView({
    super.key,
    required this.onGoOnline,
    this.isGoingOnline = false,
  });

  @override
  State<OfflineModeView> createState() => _OfflineModeViewState();
}

class _OfflineModeViewState extends State<OfflineModeView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.35).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutQuad),
    );

    _opacityAnimation = Tween<double>(begin: 0.6, end: 0.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutQuad),
    );

    if (widget.isGoingOnline) {
      _pulseController.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant OfflineModeView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isGoingOnline && !oldWidget.isGoingOnline) {
      _pulseController.repeat();
    } else if (!widget.isGoingOnline && oldWidget.isGoingOnline) {
      _pulseController.stop();
      _pulseController.reset();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 24),

        // Animated Power / Radar Illustration
        SizedBox(
          width: 200,
          height: 180,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Pulsing green radar ripple when going online
              if (widget.isGoingOnline)
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    return Container(
                      width: 140 * _scaleAnimation.value,
                      height: 140 * _scaleAnimation.value,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF009048).withValues(
                          alpha: _opacityAnimation.value * 0.4,
                        ),
                        border: Border.all(
                          color: const Color(0xFF009048).withValues(
                            alpha: _opacityAnimation.value,
                          ),
                          width: 2,
                        ),
                      ),
                    );
                  },
                ),

              // Illustration image with smooth animated scale when active
              AnimatedScale(
                scale: widget.isGoingOnline ? 1.05 : 1.0,
                duration: const Duration(milliseconds: 300),
                child: Image.asset(
                  'assets/images/offline-ui.png',
                  width: 200,
                  height: 180,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: widget.isGoingOnline
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFF1F5F9),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.power_settings_new_rounded,
                      size: 56,
                      color: widget.isGoingOnline
                          ? const Color(0xFF009048)
                          : const Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // Title with animated cross-fade
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Text(
            widget.isGoingOnline ? 'Going online...' : "You're offline",
            key: ValueKey<bool>(widget.isGoingOnline),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
        ),

        const SizedBox(height: 8),

        // Subtitle with animated cross-fade
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Text(
            widget.isGoingOnline
                ? 'Connecting to GPS & Ryva Network...\nGetting you ready for rides.'
                : 'Go online to start receiving\nride requests and earn.',
            key: ValueKey<bool>(widget.isGoingOnline),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              height: 1.4,
              color: Color(0xFF64748B),
            ),
          ),
        ),

        const SizedBox(height: 28),

        // "Go Online" / "Connecting..." button
        Center(
          child: SizedBox(
            width: MediaQuery.of(context).size.width * 0.65,
            height: 48,
            child: widget.isGoingOnline
                ? ElevatedButton(
                    onPressed: null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF009048),
                      disabledBackgroundColor: const Color(0xFF009048),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Going Online...',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  )
                : OutlinedButton.icon(
                    onPressed: widget.onGoOnline,
                    icon: const Icon(
                      Icons.power_settings_new_rounded,
                      color: Color(0xFF009048),
                      size: 18,
                    ),
                    label: const Text(
                      'Go Online',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF009048),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      side: const BorderSide(
                        color: Color(0xFF009048),
                        width: 1.2,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      backgroundColor: Colors.white,
                    ),
                  ),
          ),
        ),

        const SizedBox(height: 36),
      ],
    );
  }
}
