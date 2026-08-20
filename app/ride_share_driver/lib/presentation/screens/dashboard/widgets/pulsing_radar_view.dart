import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Premium Ryva Ride "Searching for rides" radar animation widget.
///
/// Features:
/// - Exact center placement of the Ryva car illustration with soft radial aura.
/// - Concentric rings (solid & dashed) with progressive opacity.
/// - Expanding pulse waves radiating outward smoothly.
/// - Subtle blue (#0165B7) and yellow (#FFC800) orbital paths & traveling nodes.
/// - Green (#01A34D) searching tracking nodes along outer trajectories.
/// - Gently floating location pin at top outer perimeter with soft aura glow.
/// - No rotating needle/wedge line in the middle.
/// - Independent animation controllers for organic motion.
/// - Fully responsive sizing with LayoutBuilder.
class PulsingRadarView extends StatefulWidget {
  const PulsingRadarView({super.key});

  @override
  State<PulsingRadarView> createState() => _PulsingRadarViewState();
}

class _PulsingRadarViewState extends State<PulsingRadarView>
    with TickerProviderStateMixin {
  // 1. Pulse controller (2.5s expanding pulse waves)
  late final AnimationController _pulseController;

  // 2. Outer Blue & Green orbital tracking nodes (7.0s cycle)
  late final AnimationController _orbitController;

  // 3. Yellow accent node controller (6.2s cycle)
  late final AnimationController _yellowOrbitController;

  // 4. Pin float controller (2.0s easeInOut reverse)
  late final AnimationController _pinFloatController;
  late final Animation<double> _pinFloatAnimation;

  // 5. Car breathing subtle scale (2.8s easeInOut reverse)
  late final AnimationController _carBreathController;
  late final Animation<double> _carBreathAnimation;

  // Listenable combiner for repaints
  late final Listenable _repaintNotifier;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat();

    _orbitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 7000),
    )..repeat();

    _yellowOrbitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 6200),
    )..repeat();

    _pinFloatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _pinFloatAnimation = Tween<double>(begin: 0.0, end: -4.0).animate(
      CurvedAnimation(parent: _pinFloatController, curve: Curves.easeInOut),
    );

    _carBreathController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat(reverse: true);

    _carBreathAnimation = Tween<double>(begin: 1.0, end: 1.025).animate(
      CurvedAnimation(parent: _carBreathController, curve: Curves.easeInOut),
    );

    _repaintNotifier = Listenable.merge([
      _pulseController,
      _orbitController,
      _yellowOrbitController,
    ]);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _orbitController.dispose();
    _yellowOrbitController.dispose();
    _pinFloatController.dispose();
    _carBreathController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate responsive square size: clamp between 260px and 310px
        final availableWidth = constraints.maxWidth;
        final size = availableWidth > 0
            ? availableWidth.clamp(260.0, 310.0)
            : 290.0;

        return SizedBox(
          width: size,
          height: size,
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              // Custom Painted Radar Canvas (rings, orbits, nodes, pulses)
              CustomPaint(
                size: Size(size, size),
                painter: _PremiumRadarPainter(
                  pulseProgress: _pulseController,
                  orbitProgress: _orbitController,
                  yellowOrbitProgress: _yellowOrbitController,
                  repaint: _repaintNotifier,
                ),
              ),

              // Central Car perfectly in the center with subtle breathing
              AnimatedBuilder(
                animation: _carBreathAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _carBreathAnimation.value,
                    child: SizedBox(
                      width: size * 0.26,
                      height: size * 0.26,
                      child: Center(
                        child: Image.asset(
                          'assets/images/finding-inner-car.png',
                          width: size * 0.16,
                          height: size * 0.16,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(
                            Icons.directions_car_rounded,
                            color: Color(0xFF01A34D),
                            size: 32,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),

              // Floating Location Pin at Top Perimeter with soft glow
              AnimatedBuilder(
                animation: _pinFloatAnimation,
                builder: (context, child) {
                  final topOffset = (size * 0.012) + _pinFloatAnimation.value;

                  return Positioned(
                    top: topOffset,
                    child: _buildLocationPinBadge(),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  /// Premium top location pin marker matching reference artwork
  Widget _buildLocationPinBadge() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Outer soft aura around pin
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF01A34D).withValues(alpha: 0.14),
            border: Border.all(
              color: const Color(0xFF01A34D).withValues(alpha: 0.32),
              width: 1.2,
            ),
          ),
          child: Center(
            child: Container(
              width: 26,
              height: 26,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFF01A34D),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x3301A34D),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: const Center(
                child: Icon(
                  Icons.location_on_rounded,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
          ),
        ),
        // Tiny base anchor dot
        Container(
          width: 4.5,
          height: 4.5,
          margin: const EdgeInsets.only(top: 2),
          decoration: const BoxDecoration(
            color: Color(0xFF01A34D),
            shape: BoxShape.circle,
          ),
        ),
      ],
    );
  }
}

/// CustomPainter that renders the complete radar system without rotating needles:
/// - Grids, Multi-layered Radial Glows, Concentric Rings (Solid + Dashed)
/// - Expanding Radar Pulse Waves
/// - Blue & Yellow Arc Orbits with active travelling nodes
/// - Green searching tracking nodes
class _PremiumRadarPainter extends CustomPainter {
  final Animation<double> pulseProgress;
  final Animation<double> orbitProgress;
  final Animation<double> yellowOrbitProgress;

  // Brand Palette
  static const Color primaryGreen = Color(0xFF01A34D);
  static const Color accentBlue = Color(0xFF0165B7);
  static const Color accentYellow = Color(0xFFFFC800);

  _PremiumRadarPainter({
    required this.pulseProgress,
    required this.orbitProgress,
    required this.yellowOrbitProgress,
    required Listenable repaint,
  }) : super(repaint: repaint);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2;

    // ── 1. Extremely Subtle Background Crosshairs ──────────────────────────
    final gridPaint = Paint()
      ..color = accentBlue.withValues(alpha: 0.05)
      ..strokeWidth = 0.8;

    canvas.drawLine(
      Offset(center.dx, maxRadius * 0.12),
      Offset(center.dx, size.height - maxRadius * 0.12),
      gridPaint,
    );
    canvas.drawLine(
      Offset(maxRadius * 0.12, center.dy),
      Offset(size.width - maxRadius * 0.12, center.dy),
      gridPaint,
    );

    // ── 2. Layered Central Soft Glow ───────────────────────────────────────
    // Layer 3 (Outer most glow): radius ~ 46%
    final outerGlowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          primaryGreen.withValues(alpha: 0.15),
          primaryGreen.withValues(alpha: 0.05),
          Colors.transparent,
        ],
        stops: const [0.0, 0.65, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: maxRadius * 0.46));
    canvas.drawCircle(center, maxRadius * 0.46, outerGlowPaint);

    // Layer 2 (Middle glow): radius ~ 34%
    final midGlowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          primaryGreen.withValues(alpha: 0.30),
          primaryGreen.withValues(alpha: 0.12),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: maxRadius * 0.34));
    canvas.drawCircle(center, maxRadius * 0.34, midGlowPaint);

    // Layer 1 (Inner solid tint): radius ~ 25%
    final innerCirclePaint = Paint()
      ..color = const Color(0xFFE8F5E9).withValues(alpha: 0.75)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, maxRadius * 0.25, innerCirclePaint);

    // ── 3. Expanding Pulse Waves ───────────────────────────────────────────
    _drawExpandingPulses(canvas, center, maxRadius);

    // ── 4. Concentric Radar Rings ──────────────────────────────────────────
    _drawConcentricRings(canvas, center, maxRadius);

    // ── 5. Colored Orbital Arcs (Blue & Yellow) ────────────────────────────
    _drawOrbitalArcs(canvas, center, maxRadius);

    // ── 6. Dynamic Traveling Nodes (Green, Blue, Yellow) ───────────────────
    _drawTrackingNodes(canvas, center, maxRadius);
  }

  /// Draws smooth expanding pulse waves from inner ring toward perimeter
  void _drawExpandingPulses(Canvas canvas, Offset center, double maxRadius) {
    final p = pulseProgress.value;
    // 2 staggered pulse waves
    for (int i = 0; i < 2; i++) {
      final progress = (p + (i * 0.5)) % 1.0;
      final radius = (maxRadius * 0.30) + (maxRadius * 0.62 * progress);
      final opacity = (1.0 - progress) * 0.18;

      if (opacity > 0.005) {
        final pulsePaint = Paint()
          ..color = primaryGreen.withValues(alpha: opacity)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.2;

        canvas.drawCircle(center, radius, pulsePaint);
      }
    }
  }

  /// Concentric Radar Rings with varied dash patterns & opacities
  void _drawConcentricRings(Canvas canvas, Offset center, double maxRadius) {
    // Ring 1: radius ~ 34% (Solid, crisp inner boundary)
    final ring1Paint = Paint()
      ..color = primaryGreen.withValues(alpha: 0.22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    canvas.drawCircle(center, maxRadius * 0.34, ring1Paint);

    // Ring 2: radius ~ 48% (Dashed thin green ring)
    _drawDashedCircle(canvas, center, maxRadius * 0.48, primaryGreen.withValues(alpha: 0.14), dashCount: 40);

    // Ring 3: radius ~ 64% (Solid medium green ring)
    final ring3Paint = Paint()
      ..color = primaryGreen.withValues(alpha: 0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawCircle(center, maxRadius * 0.64, ring3Paint);

    // Ring 4: radius ~ 80% (Dashed light green ring)
    _drawDashedCircle(canvas, center, maxRadius * 0.80, primaryGreen.withValues(alpha: 0.12), dashCount: 48);

    // Ring 5: radius ~ 94% (Outer perimeter solid hairline)
    final ring5Paint = Paint()
      ..color = primaryGreen.withValues(alpha: 0.10)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9;
    canvas.drawCircle(center, maxRadius * 0.94, ring5Paint);
  }

  /// Helper to draw dashed circular rings
  void _drawDashedCircle(
    Canvas canvas,
    Offset center,
    double radius,
    Color color, {
    int dashCount = 36,
  }) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final step = (2 * math.pi) / dashCount;
    final dashLength = step * 0.55;

    for (int i = 0; i < dashCount; i++) {
      final startAngle = i * step;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        dashLength,
        false,
        paint,
      );
    }
  }

  /// Subtle Brand Orbital Arcs (Blue in upper-right / Yellow in lower-left)
  void _drawOrbitalArcs(Canvas canvas, Offset center, double maxRadius) {
    // 1. Blue Orbit Arc (Ring 5 / outer radius ~94%, upper-right quadrant ~-40° to +60°)
    final blueArcPaint = Paint()
      ..color = accentBlue.withValues(alpha: 0.28)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 1.8;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: maxRadius * 0.94),
      -math.pi / 4.5,
      math.pi / 2.2,
      false,
      blueArcPaint,
    );

    // 2. Yellow Accent Arc (Ring 4 / radius ~80%, lower-left quadrant ~120° to 220°)
    final yellowArcPaint = Paint()
      ..color = accentYellow.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 1.6;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: maxRadius * 0.80),
      math.pi * 0.65,
      math.pi * 0.55,
      false,
      yellowArcPaint,
    );
  }

  /// Dynamic Tracking Nodes positioned along specific radii
  void _drawTrackingNodes(Canvas canvas, Offset center, double maxRadius) {
    final t1 = orbitProgress.value * 2 * math.pi;
    final tYellow = yellowOrbitProgress.value * 2 * math.pi;

    // ── A. Blue Node (travels along outer perimeter ~94% radius) ───────────
    final blueAngle = (-math.pi / 4.5) + (math.sin(t1) * 0.5 + 0.5) * (math.pi / 2.2);
    final bluePos = Offset(
      center.dx + (maxRadius * 0.94) * math.cos(blueAngle),
      center.dy + (maxRadius * 0.94) * math.sin(blueAngle),
    );

    // Blue Node outer soft halo
    canvas.drawCircle(
      bluePos,
      7.0,
      Paint()..color = accentBlue.withValues(alpha: 0.16),
    );
    // Blue Node solid center
    canvas.drawCircle(
      bluePos,
      4.2,
      Paint()..color = accentBlue,
    );

    // ── B. Yellow Accent Node (travels along ~80% radius) ─────────────────
    final yellowAngle = (math.pi * 0.65) + (math.sin(tYellow) * 0.5 + 0.5) * (math.pi * 0.55);
    final yellowPos = Offset(
      center.dx + (maxRadius * 0.80) * math.cos(yellowAngle),
      center.dy + (maxRadius * 0.80) * math.sin(yellowAngle),
    );

    // Yellow Node outer soft halo
    canvas.drawCircle(
      yellowPos,
      5.5,
      Paint()..color = accentYellow.withValues(alpha: 0.20),
    );
    // Yellow Node solid center
    canvas.drawCircle(
      yellowPos,
      3.2,
      Paint()..color = accentYellow,
    );

    // ── C. Green Tracking Nodes (Searching indicator dots) ────────────────
    // Green Node 1 (Mid ring ~64% radius, rotates counter-clockwise slowly)
    final g1Angle = -t1 * 0.75 + 1.2;
    final g1Pos = Offset(
      center.dx + (maxRadius * 0.64) * math.cos(g1Angle),
      center.dy + (maxRadius * 0.64) * math.sin(g1Angle),
    );
    canvas.drawCircle(g1Pos, 6.0, Paint()..color = primaryGreen.withValues(alpha: 0.18));
    canvas.drawCircle(g1Pos, 3.6, Paint()..color = primaryGreen);

    // Green Node 2 (Inner-mid ring ~48% radius, rotates clockwise)
    final g2Angle = t1 * 0.55 + 3.8;
    final g2Pos = Offset(
      center.dx + (maxRadius * 0.48) * math.cos(g2Angle),
      center.dy + (maxRadius * 0.48) * math.sin(g2Angle),
    );
    canvas.drawCircle(g2Pos, 3.0, Paint()..color = primaryGreen.withValues(alpha: 0.7));

    // Green Node 3 (Outer ring ~94% radius, subtle satellite)
    final g3Angle = t1 * 0.4 + 2.6;
    final g3Pos = Offset(
      center.dx + (maxRadius * 0.94) * math.cos(g3Angle),
      center.dy + (maxRadius * 0.94) * math.sin(g3Angle),
    );
    canvas.drawCircle(g3Pos, 2.5, Paint()..color = primaryGreen.withValues(alpha: 0.5));
  }

  @override
  bool shouldRepaint(covariant _PremiumRadarPainter oldDelegate) => true;
}
