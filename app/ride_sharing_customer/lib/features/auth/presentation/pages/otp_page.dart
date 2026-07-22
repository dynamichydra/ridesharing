import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../injection_container.dart';
import '../bloc/auth_bloc.dart';

class OtpPage extends StatefulWidget {
  final String phoneNumber;
  const OtpPage({super.key, required this.phoneNumber});

  @override
  State<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends State<OtpPage> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _isValid = true;

  @override
  void dispose() {
    _otpController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _submit() async {
    final otp = _otpController.text.trim();
    if (otp.length == 6) {
      setState(() {
        _isValid = true;
      });
      // Save mock token & userId in StorageService to bypass API validation
      try {
        final storage = sl<StorageService>();
        await storage.saveToken('mock_user_token');
        await storage.saveUserId('mock_user_id');
      } catch (_) {}
      
      if (mounted) {
        context.go('/home');
      }
    } else {
      setState(() {
        _isValid = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
          onPressed: () => context.pop(),
        ),
      ),
      body: Stack(
        children: [
          // Bottom Curves Footer
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: CustomPaint(
              size: Size(MediaQuery.of(context).size.width, 160),
              painter: BottomCurvesGreenPainter(),
            ),
          ),
          // Main Content
          SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.l),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 16),
                      // Top Green Circle Verify Device Illustration
                      Center(
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: const Color(0xFF01A34D).withOpacity(0.08),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.phonelink_setup_rounded,
                            size: 48,
                            color: Color(0xFF01A34D),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      // Title
                      const Text(
                        'Verify your number',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF021B47),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Subtitle
                      Text(
                        'Enter the 6-digit code sent to\n${widget.phoneNumber.isNotEmpty ? widget.phoneNumber : "+91 98765 43210"}',
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF535E79),
                          fontWeight: FontWeight.w500,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 36),
                      
                      // 6 PIN Boxes stack
                      Stack(
                        children: [
                          Opacity(
                            opacity: 0.0,
                            child: SizedBox(
                              height: 56,
                              child: TextField(
                                controller: _otpController,
                                focusNode: _focusNode,
                                keyboardType: TextInputType.number,
                                maxLength: 6,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                ],
                                enableSuggestions: false,
                                autocorrect: false,
                                showCursor: false,
                                decoration: const InputDecoration(
                                  counterText: '',
                                  border: InputBorder.none,
                                ),
                                onChanged: (val) {
                                  setState(() {
                                    if (!_isValid && val.length == 6) {
                                      _isValid = true;
                                    }
                                  });
                                  if (val.length == 6) {
                                    _submit();
                                  }
                                },
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              _focusNode.requestFocus();
                            },
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: List.generate(6, (index) {
                                final text = _otpController.text;
                                String char = '';
                                if (index < text.length) {
                                  char = text[index];
                                }
                                final isFocused = _focusNode.hasFocus && index == text.length;
                                final hasValue = char.isNotEmpty;

                                return Container(
                                  width: 48,
                                  height: 54,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: !_isValid
                                          ? const Color(0xFFE53935)
                                          : isFocused
                                              ? const Color(0xFF01A34D)
                                              : hasValue
                                                  ? const Color(0xFF01A34D)
                                                  : const Color(0xFFE2E7E9),
                                      width: (isFocused || hasValue) ? 2 : 1,
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    char,
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: hasValue ? const Color(0xFF01A34D) : const Color(0xFF021B47),
                                    ),
                                  ),
                                );
                              }),
                            ),
                          ),
                        ],
                      ),
                      if (!_isValid) ...[
                        const SizedBox(height: 8),
                        const Text(
                          'Please enter a valid 6-digit code',
                          style: TextStyle(
                            color: Color(0xFFE53935),
                            fontSize: 13,
                          ),
                        ),
                      ],
                      const SizedBox(height: 32),
                      
                      // Didn't receive code? Resend OTP
                      Center(
                        child: Column(
                          children: [
                            const Text(
                              "Didn't receive the code?",
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF535E79),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Mock OTP Code Resent! Check: 123456'),
                                  ),
                                );
                              },
                              child: const Text(
                                'Resend OTP (00:28)',
                                style: TextStyle(
                                  color: Color(0xFF01A34D),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      // Security Checkmark Card Banner
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF01A34D).withOpacity(0.04),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF01A34D).withOpacity(0.12)),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.security_rounded,
                              color: Color(0xFF01A34D),
                              size: 28,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text(
                                    'Your verification is safe',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF021B47),
                                      fontSize: 14,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'We use bank-level security to protect your information.',
                                    style: TextStyle(
                                      color: Color(0xFF535E79),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 180),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class BottomCurvesGreenPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // 1. Blue road curve on the left
    final paintBlue = Paint()
      ..color = const Color(0xFF0165B7)
      ..style = PaintingStyle.fill;

    final pathBlue = Path();
    pathBlue.moveTo(0, size.height);
    pathBlue.lineTo(0, size.height * 0.4);
    pathBlue.quadraticBezierTo(
      size.width * 0.28,
      size.height * 0.35,
      size.width * 0.52,
      size.height,
    );
    pathBlue.close();
    canvas.drawPath(pathBlue, paintBlue);

    // Dotted/dashed white line representing lane divider on the blue road
    final paintDashes = Paint()
      ..color = Colors.white
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final pathDashes = Path();
    pathDashes.moveTo(0, size.height * 0.52);
    pathDashes.quadraticBezierTo(
      size.width * 0.25,
      size.height * 0.48,
      size.width * 0.44,
      size.height,
    );

    // Draw dashed segments along the path
    drawDashedPath(canvas, pathDashes, paintDashes, 8.0, 6.0);

    // 2. Green curve on the right (matching the Verify OTP page)
    final paintGreen = Paint()
      ..color = const Color(0xFF01A34D)
      ..style = PaintingStyle.fill;

    final pathGreen = Path();
    pathGreen.moveTo(size.width, size.height);
    pathGreen.lineTo(size.width, size.height * 0.45);
    pathGreen.quadraticBezierTo(
      size.width * 0.8,
      size.height * 0.45,
      size.width * 0.61,
      size.height,
    );
    pathGreen.close();
    canvas.drawPath(pathGreen, paintGreen);
  }

  void drawDashedPath(Canvas canvas, Path path, Paint paint, double dashLength, double gapLength) {
    final PathMetrics metrics = path.computeMetrics();
    for (final PathMetric metric in metrics) {
      double distance = 0.0;
      while (distance < metric.length) {
        final double length = min(dashLength, metric.length - distance);
        final Path extract = metric.extractPath(distance, distance + length);
        canvas.drawPath(extract, paint);
        distance += dashLength + gapLength;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
