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

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.4).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOutQuad),
    );

    _opacityAnimation = Tween<double>(begin: 0.5, end: 0.0).animate(
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
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 16),

        // Illustration Area
        SizedBox(
          width: double.infinity,
          height: 200,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Subtle green tinted radial background
              Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF009048).withOpacity(0.08),
                      Colors.transparent,
                    ],
                    radius: 0.9,
                  ),
                  shape: BoxShape.circle,
                ),
              ),

              // Pulsing rings when going online
              if (widget.isGoingOnline)
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    return Container(
                      width: 150 * _scaleAnimation.value,
                      height: 150 * _scaleAnimation.value,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFF009048).withOpacity(_opacityAnimation.value),
                          width: 2,
                        ),
                      ),
                    );
                  },
                ),

              // Main illustration
              AnimatedScale(
                scale: widget.isGoingOnline ? 1.06 : 1.0,
                duration: const Duration(milliseconds: 400),
                child: Image.asset(
                  'assets/images/offline-ui.png',
                  width: 180,
                  height: 180,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) =>
                      _buildFallbackIllustration(),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Title
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Text(
            widget.isGoingOnline ? 'Going online...' : 'Go Online to Start Earning',
            key: ValueKey<bool>(widget.isGoingOnline),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0B1D35),
              height: 1.2,
            ),
          ),
        ),

        const SizedBox(height: 10),

        // Subtitle
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              widget.isGoingOnline
                  ? 'Connecting to GPS & Ryva Network...\nGetting you ready for rides.'
                  : 'You will start receiving ride requests in your area',
              key: ValueKey<bool>(widget.isGoingOnline),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.5,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
        ),

        const SizedBox(height: 32),

        // Go Online Button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: widget.isGoingOnline
                  ? ElevatedButton(
                      key: const ValueKey('loading'),
                      onPressed: null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        disabledBackgroundColor: const Color(0xFF009048),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
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
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ElevatedButton(
                      key: const ValueKey('go-online'),
                      onPressed: widget.onGoOnline,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shadowColor: const Color(0xFF009048).withOpacity(0.3),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Go Online',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
            ),
          ),
        ),

        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildFallbackIllustration() {
    return Container(
      width: 160,
      height: 160,
      decoration: BoxDecoration(
        color: widget.isGoingOnline
            ? const Color(0xFFDCFCE7)
            : const Color(0xFFF1F5F9),
        shape: BoxShape.circle,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Car icon
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF009048).withOpacity(0.15),
                  blurRadius: 16,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: Icon(
              Icons.directions_car_rounded,
              size: 48,
              color: widget.isGoingOnline
                  ? const Color(0xFF009048)
                  : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
