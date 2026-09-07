import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../injection_container.dart';
import '../../domain/repositories/booking_repository.dart';
import '../bloc/booking_bloc.dart';

class PromoCodesPage extends StatefulWidget {
  const PromoCodesPage({super.key});

  @override
  State<PromoCodesPage> createState() => _PromoCodesPageState();
}

class _PromoCodesPageState extends State<PromoCodesPage> {
  final TextEditingController _promoController = TextEditingController();
  final TextEditingController _referralController = TextEditingController();

  bool _isApplying = false;
  bool _isApplyingReferral = false;
  bool _isLoadingReferralInfo = true;

  String? _myReferralCode;
  int _totalReferrals = 0;
  double _totalEarned = 0.0;

  final List<Map<String, dynamic>> _availableOffers = [
    {
      'code': 'WELCOME50',
      'title': '50% Off First Ride',
      'description': 'Get 50% discount on your first ride up to ₹100.',
      'minFare': 100,
      'discountType': 'percentage',
      'discountValue': '50%',
      'tag': 'FIRST RIDE',
      'color': const Color(0xFF009048),
    },
    {
      'code': 'FLAT100',
      'title': 'Flat ₹100 Off',
      'description': 'Enjoy flat ₹100 savings on rides above ₹200.',
      'minFare': 200,
      'discountType': 'flat',
      'discountValue': '₹100',
      'tag': 'BEST VALUE',
      'color': const Color(0xFF0065B3),
    },
    {
      'code': 'WEEKEND25',
      'title': '25% Weekend Discount',
      'description': 'Save 25% on peak weekend trips up to ₹50.',
      'minFare': 150,
      'discountType': 'percentage',
      'discountValue': '25%',
      'tag': 'WEEKEND',
      'color': const Color(0xFF7C3AED),
    },
    {
      'code': 'FESTIVE50',
      'title': '20% Festive Savings',
      'description': 'Special 20% discount on city rides above ₹250.',
      'minFare': 250,
      'discountType': 'percentage',
      'discountValue': '20%',
      'tag': 'SPECIAL',
      'color': const Color(0xFFE65100),
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadReferralInfo();
  }

  @override
  void dispose() {
    _promoController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  Future<void> _loadReferralInfo() async {
    try {
      final repository = sl<BookingRepository>();
      final data = await repository.getMyReferralInfo();
      if (mounted) {
        setState(() {
          _myReferralCode = data['referralCode']?.toString();
          _totalReferrals = (data['totalReferrals'] as int?) ?? 0;
          final earnedMinor = (data['totalEarnedMinor'] as int?) ?? 0;
          _totalEarned = earnedMinor / 100.0;
          _isLoadingReferralInfo = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingReferralInfo = false;
        });
      }
    }
  }

  void _applyPromoCode([String? predefinedCode]) {
    final code = (predefinedCode ?? _promoController.text).trim().toUpperCase();
    if (code.isEmpty) {
      CustomToast.show(context, 'Please enter a promo code');
      return;
    }

    _promoController.text = code;

    final bookingState = context.read<BookingBloc>().state;
    if (bookingState is BookingVehicleOptionsLoaded) {
      setState(() {
        _isApplying = true;
      });
      context.read<BookingBloc>().add(ApplyPromoCode(code));
    } else {
      // User is viewing promo page without an active booking (e.g. from Home banner)
      _validateStandalonePromo(code);
    }
  }

  Future<void> _validateStandalonePromo(String code) async {
    setState(() {
      _isApplying = true;
    });
    try {
      final repository = sl<BookingRepository>();
      final result = await repository.validatePromo(code, 200.0);
      if (mounted) {
        setState(() {
          _isApplying = false;
        });
        final discountType = result['discountType']?.toString() ?? 'discount';
        final discountVal = result['discountValue']?.toString() ?? '';
        final desc = result['description']?.toString() ?? '$discountVal $discountType';
        _showValidPromoDialog(code, desc);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isApplying = false;
        });
        final msg = e.toString().replaceAll('Exception: ', '');
        CustomToast.show(context, msg);
      }
    }
  }

  void _showValidPromoDialog(String code, String desc) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(
                color: Color(0xFFE8F5E9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: Color(0xFF009048), size: 40),
            ),
            const SizedBox(height: 16),
            Text(
              'Coupon "$code" is Valid!',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF021B47),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              desc.isNotEmpty ? desc : 'This coupon is active and ready to use.',
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  context.pop();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF009048),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: const Text('Book a Ride to Apply', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _applyReferral() async {
    final code = _referralController.text.trim().toUpperCase();
    if (code.isEmpty) {
      CustomToast.show(context, 'Please enter a referral code');
      return;
    }

    setState(() {
      _isApplyingReferral = true;
    });

    try {
      final repository = sl<BookingRepository>();
      await repository.applyReferralCode(code);
      if (mounted) {
        setState(() {
          _isApplyingReferral = false;
        });
        _referralController.clear();
        CustomToast.show(context, 'Referral code applied! Reward will credit after your first ride.');
        _loadReferralInfo();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isApplyingReferral = false;
        });
        final msg = e.toString().replaceAll('Exception: ', '');
        CustomToast.show(context, msg);
      }
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    CustomToast.show(context, '$label copied to clipboard');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Promos & Offers',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF021B47), size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocListener<BookingBloc, BookingState>(
        listener: (context, state) {
          if (state is BookingVehicleOptionsLoaded) {
            setState(() {
              _isApplying = false;
            });
            if (state.appliedPromoCode != null &&
                state.appliedPromoCode == _promoController.text.trim().toUpperCase()) {
              CustomToast.show(context, 'Promo code applied successfully!');
              context.pop();
            }
          } else if (state is BookingError) {
            setState(() {
              _isApplying = false;
            });
            CustomToast.show(context, state.message);
          }
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Currently Active Promo (if any)
              BlocBuilder<BookingBloc, BookingState>(
                builder: (context, state) {
                  if (state is BookingVehicleOptionsLoaded && state.appliedPromoCode != null) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5E9),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFF009048).withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: const BoxDecoration(
                              color: Color(0xFF009048),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.check, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      state.appliedPromoCode!,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF009048),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF009048),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'ACTIVE',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  state.discountAmount != null && state.discountAmount! > 0
                                      ? 'Saving ₹${state.discountAmount!.toStringAsFixed(0)} on selected vehicle'
                                      : (state.promoDescription ?? 'Applied to current booking'),
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF2E7D32)),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              context.read<BookingBloc>().add(RemovePromoCode());
                              CustomToast.show(context, 'Promo code removed');
                            },
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFFE53935),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('Remove', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),

              // 2. Manual Promo Code Input
              const Text(
                'Enter Promo Code',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF021B47),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E7E9)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: TextField(
                        controller: _promoController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          hintText: 'e.g. WELCOME50',
                          hintStyle: TextStyle(color: Color(0xFF8A94A6), fontSize: 14),
                          prefixIcon: Icon(Icons.discount_outlined, color: Color(0xFF009048), size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isApplying ? null : () => _applyPromoCode(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                      ),
                      child: _isApplying
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : const Text(
                              'Apply',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 26),

              // 3. Available Offers List
              const Text(
                'Available Offers',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF021B47),
                ),
              ),
              const SizedBox(height: 12),
              ..._availableOffers.map((offer) => _buildOfferCard(offer)),

              const SizedBox(height: 26),

              // 4. Referral Section
              _buildReferralSection(),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOfferCard(Map<String, dynamic> offer) {
    final code = offer['code'] as String;
    final title = offer['title'] as String;
    final description = offer['description'] as String;
    final minFare = offer['minFare'] as int;
    final tag = offer['tag'] as String;
    final color = offer['color'] as Color;

    return BlocBuilder<BookingBloc, BookingState>(
      builder: (context, state) {
        final isApplied = (state is BookingVehicleOptionsLoaded) && state.appliedPromoCode == code;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isApplied ? const Color(0xFF009048) : const Color(0xFFE2E7E9),
              width: isApplied ? 1.8 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        tag,
                        style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    Text(
                      'Min fare ₹$minFare',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF021B47),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            description,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                      ),
                      child: Row(
                        children: [
                          Text(
                            code,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                              color: Color(0xFF021B47),
                            ),
                          ),
                          const SizedBox(width: 6),
                          GestureDetector(
                            onTap: () => _copyToClipboard(code, 'Promo code'),
                            child: const Icon(Icons.copy_rounded, size: 14, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    if (isApplied)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check, size: 14, color: Color(0xFF009048)),
                            SizedBox(width: 4),
                            Text(
                              'Applied',
                              style: TextStyle(
                                color: Color(0xFF009048),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ElevatedButton(
                        onPressed: () => _applyPromoCode(code),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Apply Code', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReferralSection() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E7E9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner gradient
          Container(
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF021B47), Color(0xFF0A3B8C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.vertical(top: Radius.circular(19)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Refer a friend, get ₹50',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Share your code. When a friend finishes their 1st trip, you both receive ₹50 wallet cash!',
                        style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Referral stats & share code
                const Text(
                  'Your Referral Code',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E7E9)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _isLoadingReferralInfo
                              ? 'Loading code...'
                              : (_myReferralCode ?? 'Generating code...'),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                            color: Color(0xFF021B47),
                          ),
                        ),
                      ),
                      if (_myReferralCode != null)
                        ElevatedButton.icon(
                          onPressed: () => _copyToClipboard(_myReferralCode!, 'Referral code'),
                          icon: const Icon(Icons.copy_rounded, size: 14),
                          label: const Text('Copy'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF021B47),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                    ],
                  ),
                ),

                if (_totalReferrals > 0 || _totalEarned > 0) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '$_totalReferrals Invited',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '₹${_totalEarned.toStringAsFixed(0)} Earned',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0369A1)),
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 18),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 16),

                // Apply a Friend's Referral Code
                const Text(
                  "Have a Friend's Referral Code?",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E7E9)),
                        ),
                        child: TextField(
                          controller: _referralController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: const InputDecoration(
                            hintText: 'Enter friend\'s code (e.g. REF-ABC123)',
                            hintStyle: TextStyle(color: Color(0xFF8A94A6), fontSize: 13),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      height: 44,
                      child: ElevatedButton(
                        onPressed: _isApplyingReferral ? null : _applyReferral,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                        child: _isApplyingReferral
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('Redeem', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
