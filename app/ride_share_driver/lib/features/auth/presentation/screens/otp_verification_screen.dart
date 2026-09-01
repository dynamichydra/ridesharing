import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:otp_autofill/otp_autofill.dart';
import '../../../../style/appcolors.dart';
import '../../../../presentation/screens/onboarding/widgets/three_dots_loader.dart';
import '../../../../core/localization/app_localizations.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../services/app_logger.dart';
import '../bloc/auth_bloc.dart';

class OtpVerificationScreen extends StatefulWidget {
  final String phoneNumber;
  final Function(String) onOtpVerified;
  final VoidCallback onResendRequested;
  final bool isLoading;

  const OtpVerificationScreen({
    super.key,
    required this.phoneNumber,
    required this.onOtpVerified,
    required this.onResendRequested,
    this.isLoading = false,
  });

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen>
    with TickerProviderStateMixin {
  late final OTPTextEditController _otpController;
  late final OTPInteractor _otpInteractor;
  bool _isValid = true;
  int _resendCountdown = 30;
  Timer? _timer;
  final _focusNode = FocusNode();

  // Entrance animations
  late final AnimationController _entranceController;
  late final Animation<double> _titleOpacity;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _cardOpacity;
  late final Animation<Offset> _cardSlide;

  // OTP box stagger animation
  late final AnimationController _otpStaggerController;

  @override
  void initState() {
    super.initState();

    // Set up entrance animations
    _entranceController = AnimationController(
      duration: const Duration(milliseconds: 700),
      vsync: this,
    );

    _titleOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );
    _titleSlide = Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
      ),
    );

    _cardOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.3, 0.9, curve: Curves.easeOut),
      ),
    );
    _cardSlide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.3, 0.9, curve: Curves.easeOutCubic),
      ),
    );

    // OTP boxes stagger: 600ms total, each box starts 80ms apart
    _otpStaggerController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _entranceController.forward();
    // Start OTP stagger slightly after card appears
    Future.delayed(const Duration(milliseconds: 400), () {
      if (mounted) _otpStaggerController.forward();
    });

    _focusNode.addListener(() {
      setState(() {});
    });
    _otpInteractor = OTPInteractor();
    _otpController = OTPTextEditController(
      codeLength: 6,
      otpInteractor: _otpInteractor,
    );
    if (Platform.isAndroid) {
      _otpController.startListenUserConsent((code) {
        final exp = RegExp(r'(\d{6})');
        return exp.stringMatch(code ?? '') ?? '';
      });
    }
    _otpController.text = '';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focusNode.requestFocus();
    });
    _startTimer();
  }

  void _startTimer() {
    setState(() {
      _resendCountdown = 30;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_resendCountdown > 0) {
          _resendCountdown--;
        } else {
          _timer?.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _focusNode.dispose();
    _entranceController.dispose();
    _otpStaggerController.dispose();
    if (Platform.isAndroid) {
      _otpController.stopListen();
    }
    super.dispose();
  }

  void _submit() {
    final otp = _otpController.text.trim();
    if (otp.length == 6 && RegExp(r'^[0-9]+$').hasMatch(otp)) {
      widget.onOtpVerified(otp);
    } else {
      AppLogger.d('[OtpVerificationScreen] Validation failed for entered OTP length ${otp.length}');
      setState(() {
        _isValid = false;
      });
    }
  }

  Animation<double> _otpBoxOpacity(int index) {
    final start = (index * 0.12).clamp(0.0, 0.7);
    final end = (start + 0.4).clamp(0.0, 1.0);
    return Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _otpStaggerController,
        curve: Interval(start, end, curve: Curves.easeOut),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, authState) {
        if (authState is AuthOtpSent) {
          _startTimer();
          CustomToast.show(context, 'OTP resent successfully');
        }
      },
      child: AnimatedBuilder(
        animation: Listenable.merge([_entranceController, _otpStaggerController]),
        builder: (context, _) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              SlideTransition(
                position: _titleSlide,
                child: FadeTransition(
                  opacity: _titleOpacity,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.verifyCode,
                          style: const TextStyle(
                            fontSize: 34,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.verifyCodeDesc(widget.phoneNumber),
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.white.withOpacity(0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 36),
              // White card container for inputs
              SlideTransition(
                position: _cardSlide,
                child: FadeTransition(
                  opacity: _cardOpacity,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(28),
                        topRight: Radius.circular(28),
                      ),
                    ),
                    padding: EdgeInsets.only(
                      left: 24,
                      right: 24,
                      top: 32,
                      bottom: MediaQuery.of(context).padding.bottom + 24,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisSize: MainAxisSize.min,
                      children: [
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
                                  final isFocused =
                                      _focusNode.hasFocus && index == text.length;

                                  return FadeTransition(
                                    opacity: _otpBoxOpacity(index),
                                    child: Container(
                                      width: 44,
                                      height: 52,
                                      decoration: BoxDecoration(
                                        color: Colors.grey.shade50,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: !_isValid
                                              ? AppColors.error
                                              : isFocused
                                              ? AppColors.secondary
                                              : Colors.grey.shade300,
                                          width: isFocused ? 2 : 1.5,
                                        ),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        char,
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.textPrimary,
                                        ),
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
                          Text(
                            l10n.validationOtp,
                            style: const TextStyle(
                              color: AppColors.error,
                              fontSize: 13,
                            ),
                            textAlign: TextAlign.left,
                          ),
                        ],
                        const SizedBox(height: 16),
                        TextButton(
                          onPressed: _resendCountdown > 0
                              ? null
                              : () {
                                  widget.onResendRequested();
                                },
                          child: Text(
                            _resendCountdown > 0
                                ? '${l10n.resendCode} (${_resendCountdown}s)'
                                : l10n.resendCode,
                            style: TextStyle(
                              color: _resendCountdown > 0
                                  ? Colors.grey
                                  : AppColors.secondary,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: widget.isLoading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: widget.isLoading
                              ? const ThreeDotsLoader()
                              : Text(l10n.verifyContinue),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

