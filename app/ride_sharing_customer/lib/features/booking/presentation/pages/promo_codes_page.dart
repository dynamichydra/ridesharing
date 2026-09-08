import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
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
  bool _isLoadingPromos = true;

  String? _myReferralCode;
  int _totalReferrals = 0;
  double _totalEarned = 0.0;

  List<Map<String, dynamic>> _availableOffers = [];

  @override
  void initState() {
    super.initState();
    _loadPromos();
    _loadReferralInfo();
  }

  Future<void> _loadPromos() async {
    try {
      final repository = sl<BookingRepository>();
      final List<Map<String, dynamic>> fetched = await repository
          .getAvailablePromos();
      if (mounted) {
        setState(() {
          if (fetched.isNotEmpty) {
            _availableOffers = fetched.map((p) {
              final discountType =
                  p['discountType']?.toString() ?? 'percentage';
              final discountVal = p['discountValue'] != null
                  ? p['discountValue'].toString()
                  : '0';
              final bool isFlat =
                  discountType == 'flat_amount' || discountType == 'flat';
              final String valDisplay = isFlat
                  ? 'Flat ₹$discountVal Off'
                  : '$discountVal% Discount';
              final minFare = ((p['minFareMinor'] as num?) ?? 0) / 100.0;
              final maxDiscountMinor = p['maxDiscountMinor'] as num?;
              final maxDiscount = maxDiscountMinor != null
                  ? (maxDiscountMinor / 100.0).round()
                  : null;
              final bool isFirstRide = p['isFirstRideOnly'] == true;
              final bool canApply = p['canApply'] != false;
              final bool alreadyApplied = p['alreadyApplied'] == true;
              final String statusLabel =
                  p['statusLabel']?.toString() ??
                  (canApply ? 'Available' : 'Unavailable');

              // Format validTill if present
              String? validTillStr;
              if (p['validUntil'] != null) {
                try {
                  final dt = DateTime.parse(p['validUntil'].toString());
                  final months = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ];
                  validTillStr = '${dt.day} ${months[dt.month - 1]} ${dt.year}';
                } catch (_) {}
              }

              Color tagColor = const Color(0xFF009048);
              if (isFirstRide) {
                tagColor = const Color(0xFF0065B3);
              } else if (isFlat) {
                tagColor = const Color(0xFF7C3AED);
              }

              return {
                'id': p['id']?.toString() ?? '',
                'code': p['code']?.toString() ?? '',
                'title': isFirstRide ? 'Flat ₹$discountVal Off' : valDisplay,
                'description':
                    p['description']?.toString() ??
                    'Enjoy savings on your ride.',
                'minFare': minFare.round(),
                'maxDiscount': maxDiscount,
                'validTill': validTillStr,
                'discountType': discountType,
                'discountValue': discountVal,
                'tag': isFirstRide
                    ? 'FIRST RIDE ONLY'
                    : (p['category']?.toString().toUpperCase() ??
                          (canApply ? 'PROMO' : 'SPECIAL')),
                'color': tagColor,
                'canApply': canApply,
                'alreadyApplied': alreadyApplied,
                'statusLabel': statusLabel,
              };
            }).toList();
          } else {
            // Fallback default sample promos if none configured in DB yet
            _availableOffers = [
              {
                'code': 'WELCOME50',
                'title': '50% Off First Ride',
                'description':
                    'Get 50% discount on your first ride up to ₹100.',
                'minFare': 100,
                'discountType': 'percentage',
                'discountValue': '50%',
                'tag': 'FIRST RIDE',
                'color': const Color(0xFF009048),
                'canApply': true,
                'alreadyApplied': false,
                'statusLabel': 'Available',
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
                'canApply': true,
                'alreadyApplied': false,
                'statusLabel': 'Available',
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
                'canApply': true,
                'alreadyApplied': false,
                'statusLabel': 'Available',
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
                'canApply': true,
                'alreadyApplied': false,
                'statusLabel': 'Available',
              },
            ];
          }
          _isLoadingPromos = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingPromos = false;
        });
      }
    }
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
        final desc =
            result['description']?.toString() ?? '$discountVal $discountType';
        _showValidPromoDialog(code, desc);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isApplying = false;
        });
        final rawMsg = e.toString().replaceAll('Exception: ', '').toLowerCase();
        String displayMsg = 'Invalid promo code';
        if (rawMsg.contains('min') || rawMsg.contains('minimum')) {
          displayMsg = 'Minimum ride fare not met for this promo code';
        } else if (rawMsg.contains('first ride') || rawMsg.contains('first_ride')) {
          displayMsg = 'Valid for first ride only';
        } else if (rawMsg.contains('already used') || rawMsg.contains('per user')) {
          displayMsg = 'Promo code already used';
        }
        CustomToast.show(context, displayMsg);
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
              child: const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF009048),
                size: 40,
              ),
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
              desc.isNotEmpty
                  ? desc
                  : 'This coupon is active and ready to use.',
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Book a Ride to Apply',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
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
        CustomToast.show(
          context,
          'Referral code applied! Reward will credit after your first ride.',
        );
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
          style: TextStyle(
            color: Color(0xFF021B47),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF021B47),
            size: 20,
          ),
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
                state.appliedPromoCode ==
                    _promoController.text.trim().toUpperCase()) {
              CustomToast.show(context, 'Promo code applied successfully!');
              context.pop();
            }
          } else if (state is BookingError) {
            setState(() {
              _isApplying = false;
            });
            final raw = state.message.toLowerCase();
            String err = state.message;
            if (raw.contains('invalid') || raw.contains('inactive') || raw.contains('not found') || raw.contains('expired')) {
              err = 'Invalid promo code';
            }
            CustomToast.show(context, err);
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
                  if (state is BookingVehicleOptionsLoaded &&
                      state.appliedPromoCode != null) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: const Color(0xFF009048).withValues(alpha: 0.3),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(
                              0xFF009048,
                            ).withValues(alpha: 0.06),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: const BoxDecoration(
                              color: Color(0xFF009048),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.check,
                              color: Colors.white,
                              size: 20,
                            ),
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
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
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
                                  state.discountAmount != null &&
                                          state.discountAmount! > 0
                                      ? 'Saving ₹${state.discountAmount!.toStringAsFixed(0)} on selected vehicle'
                                      : (state.promoDescription ??
                                            'Applied to current booking'),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF15803D),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              context.read<BookingBloc>().add(
                                RemovePromoCode(),
                              );
                              CustomToast.show(context, 'Promo code removed');
                            },
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFFDC2626),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: const Text(
                              'Remove',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),

              // 2. Apply Promo Code Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
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
                    const Text(
                      'Apply Promo Code',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'Have a code? Enter it below.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 48,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.confirmation_num_outlined,
                                  color: Color(0xFF009048),
                                  size: 20,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
  controller: _promoController,
  textCapitalization: TextCapitalization.characters,
  style: const TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: Color(0xFF0F172A),
  ),
  decoration: const InputDecoration(
    hintText: 'Enter promo code',
    hintStyle: TextStyle(
      color: Color(0xFF94A3B8),
      fontSize: 14,
      fontWeight: FontWeight.normal,
    ),

    // Removes all TextField borders
    border: InputBorder.none,
    enabledBorder: InputBorder.none,
    focusedBorder: InputBorder.none,
    disabledBorder: InputBorder.none,
    errorBorder: InputBorder.none,
    focusedErrorBorder: InputBorder.none,

    // Makes TextField background transparent
    filled: false,
    
    isDense: true,
    contentPadding: EdgeInsets.zero,
  ),
)
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _isApplying
                                ? null
                                : () => _applyPromoCode(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF009048),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                              ),
                            ),
                            child: _isApplying
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Text(
                                    'Apply',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // 3. Available Offers Header
              const Text(
                'Available Offers',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'Save more on every ride.',
                style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),

              if (_isLoadingPromos)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 30),
                  child: Center(
                    child: CircularProgressIndicator(color: Color(0xFF009048)),
                  ),
                )
              else
                ..._availableOffers.map((offer) => _buildOfferCard(offer)),

              const SizedBox(height: 16),

              // 4. Referral Card Section
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
    final bool canApply = offer['canApply'] != false;
    final String statusLabel =
        offer['statusLabel']?.toString() ??
        (canApply ? 'Available' : 'Unavailable');

    // Parse max discount and valid till if available or default
    final maxDiscount =
        offer['maxDiscount'] ?? (offer['discountType'] == 'flat' ? null : 100);
    final validTill = offer['validTill'] ?? '31 Dec 2026';

    return BlocBuilder<BookingBloc, BookingState>(
      builder: (context, state) {
        final isApplied =
            (state is BookingVehicleOptionsLoaded) &&
            state.appliedPromoCode == code;
        final bool isMuted = !canApply && !isApplied;

        // Custom tag background & text colors based on tag
        Color tagBgColor = const Color(0xFFDCFCE7);
        Color tagTextColor = const Color(0xFF15803D);
        if (tag.contains('FIRST RIDE')) {
          tagBgColor = const Color(0xFFE0F2FE);
          tagTextColor = const Color(0xFF0369A1);
        } else if (tag == 'SPECIAL') {
          tagBgColor = const Color(0xFFE0F2FE);
          tagTextColor = const Color(0xFF0284C7);
        } else if (tag == 'WEEKEND') {
          tagBgColor = const Color(0xFFF3E8FF);
          tagTextColor = const Color(0xFF7E22CE);
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isApplied
                  ? const Color(0xFF009048)
                  : const Color(0xFFE2E8F0),
              width: isApplied ? 1.5 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.025),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top row: Tag on left, Valid Till on right
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: isMuted
                                ? const Color(0xFFF1F5F9)
                                : tagBgColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            tag,
                            style: TextStyle(
                              color: isMuted
                                  ? const Color(0xFF64748B)
                                  : tagTextColor,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                        Text(
                          'Valid till $validTill',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Middle row: Left title + desc, Right code + action button
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Left: Title & Description
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                  letterSpacing: -0.2,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                description,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF64748B),
                                  height: 1.3,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 14),

                        // Right: Coupon Code pill + Button
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            // Code pill with copy icon
                            GestureDetector(
                              onTap: () => _copyToClipboard(code, 'Promo code'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFFCBD5E1),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      code,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.8,
                                        color: isMuted
                                            ? const Color(0xFF64748B)
                                            : const Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(
                                      Icons.copy_rounded,
                                      size: 13,
                                      color: Color(0xFF64748B),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),

                            // Action button
                            if (isApplied)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.check,
                                      size: 14,
                                      color: Color(0xFF15803D),
                                    ),
                                    SizedBox(width: 4),
                                    Text(
                                      'Applied',
                                      style: TextStyle(
                                        color: Color(0xFF15803D),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else if (isMuted)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE2E8F0),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  statusLabel,
                                  style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                              )
                            else
                              SizedBox(
                                height: 32,
                                child: ElevatedButton(
                                  onPressed: () => _applyPromoCode(code),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF009048),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    elevation: 0,
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: const Text(
                                    'Apply Code',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Bottom metadata bar
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: Color(0xFFF1F5F9), width: 1),
                  ),
                ),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Min fare - Brand Green
                      _buildMetaChip(
                        icon: Icons.sell_outlined,
                        iconColor: const Color(0xFF009048),
                        label: 'Min. fare',
                        value: '₹$minFare',
                      ),
                      _buildMetaDivider(),

                      // Max discount (if any) - Brand Blue
                      if (maxDiscount != null) ...[
                        _buildMetaChip(
                          icon: Icons.payments_outlined,
                          iconColor: const Color(0xFF0065B3),
                          label: 'Max. discount',
                          value: '₹$maxDiscount',
                        ),
                        _buildMetaDivider(),
                      ],

                      // Usage limit - Brand Yellow / Amber
                      _buildMetaChip(
                        icon: Icons.layers_outlined,
                        iconColor: const Color(0xFFF59E0B),
                        label: '',
                        value: '1 time per user',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetaDivider() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10),
      height: 12,
      width: 1,
      color: const Color(0xFFE2E8F0),
    );
  }

  Widget _buildMetaChip({
    required IconData icon,
    required String label,
    required String value,
    Color iconColor = const Color(0xFF94A3B8),
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: iconColor),
        const SizedBox(width: 4),
        if (label.isNotEmpty) ...[
          Text(
            '$label ',
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
        Text(
          value,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF334155),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildReferralSection() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDCFCE7)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.group_outlined,
                  color: Color(0xFF009048),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Refer a friend, get ₹50',
                      style: TextStyle(
                        color: Color(0xFF0F172A),
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Share your code. When a friend finishes their 1st trip, you both receive ₹50 wallet cash!',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          const Text(
            'Your Referral Code',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),

          Row(
            children: [
              Expanded(
                child: Container(
                  height: 46,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _isLoadingReferralInfo
                              ? 'Loading...'
                              : (_myReferralCode ?? 'Generating...'),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.1,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      if (_myReferralCode != null)
                        GestureDetector(
                          onTap: () => _copyToClipboard(
                            _myReferralCode!,
                            'Referral code',
                          ),
                          child: const Icon(
                            Icons.copy_rounded,
                            size: 16,
                            color: Color(0xFF64748B),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(
                height: 46,
                child: ElevatedButton(
                  onPressed: _myReferralCode != null
                      ? () =>
                            _copyToClipboard(_myReferralCode!, 'Referral code')
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF009048),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 22),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Copy',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),

          if (_totalReferrals > 0 || _totalEarned > 0) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '$_totalReferrals Invited',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF15803D),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2FE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '₹${_totalEarned.toStringAsFixed(0)} Earned',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0369A1),
                    ),
                  ),
                ),
              ],
            ),
          ],

          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFDCFCE7)),
          const SizedBox(height: 14),

          // Redeem friend referral code
          const Text(
            "Have a Friend's Referral Code?",
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 44,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _referralController,
                    textCapitalization: TextCapitalization.characters,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                    decoration: const InputDecoration(
                      hintText: 'Enter referral code (e.g. REF-12345)',
                      hintStyle: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12,
                        fontWeight: FontWeight.normal,
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(vertical: 12),
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
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: _isApplyingReferral
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Redeem',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
