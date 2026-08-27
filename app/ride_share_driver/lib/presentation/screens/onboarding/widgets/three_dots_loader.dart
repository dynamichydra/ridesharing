import 'package:flutter/material.dart';

class ThreeDotsLoader extends StatefulWidget {
  final Color color;
  final double size;
  final double spacing;

  const ThreeDotsLoader({
    super.key,
    this.color = Colors.white,
    this.size = 8.0,
    this.spacing = 6.0,
  });

  @override
  State<ThreeDotsLoader> createState() => _ThreeDotsLoaderState();
}

class _ThreeDotsLoaderState extends State<ThreeDotsLoader> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (index) {
            final delay = index * 0.2;
            final progress = (_controller.value - delay) % 1.0;
            final scale = 0.5 + 0.5 * (progress < 0.5 ? progress * 2 : (1.0 - progress) * 2);
            final opacity = 0.4 + 0.6 * (progress < 0.5 ? progress * 2 : (1.0 - progress) * 2);

            return Padding(
              padding: EdgeInsets.symmetric(horizontal: widget.spacing / 2),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: BoxDecoration(
                    color: widget.color.withValues(alpha: opacity),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
