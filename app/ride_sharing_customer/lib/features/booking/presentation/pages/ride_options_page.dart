import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/custom_toast.dart';

import '../../domain/entities/passenger_info.dart';
import '../widgets/passenger_details_sheet.dart';
import '../bloc/booking_bloc.dart';
import '../../../ride_tracking/presentation/bloc/ride_tracking_bloc.dart';
import '../../../wallet/presentation/bloc/wallet_bloc.dart';
import '../../../profile/presentation/bloc/profile_bloc.dart';
import '../../../../core/payments/saved_payment_methods_service.dart';
import '../../../../injection_container.dart';

class RideOptionsPage extends StatefulWidget {
  const RideOptionsPage({super.key});

  @override
  State<RideOptionsPage> createState() => _RideOptionsPageState();
}

class _RideOptionsPageState extends State<RideOptionsPage> {
  bool _isConfirmStep = false;
  bool _isBooking = false;
  String _paymentMethod = 'cash'; // 'cash', 'wallet', or 'pm_xxx'
  String? _preferredUnavailableNotice;
  BookingVehicleOptionsLoaded? _cachedOptions;
  bool _isBookingForSomeoneElse = false;
  PassengerInfo? _passenger;
  String? _rideNotes;

  bool _isCardEligibleForCurrency(Map<dynamic, dynamic> pm, String currency) {
    if (pm['isActive'] == false || pm['revokedAt'] != null) return false;
    if (pm['ineligibilityCode'] == 'EXPIRED') return false;

    final gw = (pm['gateway'] ?? '').toString().toLowerCase();
    final isIndianCurrency = currency.toUpperCase() == 'INR';

    if (isIndianCurrency) {
      return gw == 'razorpay';
    } else {
      // International rides (CAD, USD, EUR, GBP, AUD, etc.) -> Stripe!
      return gw == 'stripe';
    }
  }

  String? _getCardIneligibilityReason(Map<dynamic, dynamic> pm, String currency) {
    if (pm['ineligibilityCode'] == 'EXPIRED') {
      return pm['ineligibilityReason']?.toString() ?? 'Card is expired';
    }
    final gw = (pm['gateway'] ?? '').toString().toLowerCase();
    final isIndianCurrency = currency.toUpperCase() == 'INR';

    if (isIndianCurrency) {
      if (gw != 'razorpay') {
        return 'Stripe cards are only available for international rides';
      }
    } else {
      if (gw != 'stripe') {
        return 'Razorpay cards can only be used for INR rides within India';
      }
    }
    return null;
  }

  void _evaluateAndPreselectPaymentMethod(String rideCurrency) {
    final profileState = context.read<ProfileBloc>().state;
    if (profileState is! ProfileLoaded) return;
    final pms = profileState.userProfile['payment_methods'] as List? ?? [];
    if (pms.isEmpty) return;

    // 1. First check if user's default/preferred card is eligible for this ride currency
    Map<dynamic, dynamic>? preferredCard;
    for (final pm in pms) {
      if (pm is Map && (pm['isDefault'] == true || pm['isPreferred'] == true)) {
        preferredCard = pm;
        break;
      }
    }

    if (preferredCard != null && _isCardEligibleForCurrency(preferredCard, rideCurrency)) {
      setState(() {
        _paymentMethod = preferredCard!['id'].toString();
        _preferredUnavailableNotice = null;
      });
      return;
    }

    // 2. If default card is not eligible for this currency, auto-preselect ANY saved card that IS eligible!
    // E.g. When traveling to Canada (CAD), auto-select an available Stripe card!
    for (final pm in pms) {
      if (pm is Map && _isCardEligibleForCurrency(pm, rideCurrency)) {
        setState(() {
          _paymentMethod = pm['id'].toString();
          _preferredUnavailableNotice = null;
        });
        return;
      }
    }

    // 3. No eligible card for this currency -> fall back to Cash
    setState(() {
      if (_paymentMethod != 'wallet') {
        _paymentMethod = 'cash';
      }
      if (preferredCard != null) {
        final brand = (preferredCard['cardBrand'] ?? 'Card').toString().toUpperCase();
        final last4 = preferredCard['last4'] ?? '****';
        final reason = _getCardIneligibilityReason(preferredCard, rideCurrency);
        _preferredUnavailableNotice =
            'Your preferred card ($brand •••• $last4) is not available for this $rideCurrency ride. $reason';
      }
    });
  }

  Future<void> _tokenizeCardOnBookingPage({
    required String gateway,
    required String currency,
    required VoidCallback closeSheet,
  }) async {
    closeSheet();
    String? countryId;
    final bookingState = context.read<BookingBloc>().state;
    if (bookingState is BookingVehicleOptionsLoaded) countryId = bookingState.countryId;

    try {
      final saved = await sl<SavedPaymentMethodsService>().addCard(
        gateway: gateway.isNotEmpty ? gateway : null,
        currencyCode: currency.toUpperCase(),
        countryId: countryId,
        makeDefault: true,
      );
      if (!mounted) return;
      CustomToast.show(context, '${saved.title} added and selected for this ride');
      context.read<ProfileBloc>().add(LoadProfile());
      setState(() {
        _paymentMethod = saved.id;
        _preferredUnavailableNotice = null;
      });
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.cancelled ? 'Card setup cancelled' : e.message);
    }
  }

  Future<void> _removeSavedCard(String id) async {
    try {
      await sl<SavedPaymentMethodsService>().remove(id);
      if (!mounted) return;
      CustomToast.show(context, 'Payment method removed');
      if (_paymentMethod == id) setState(() => _paymentMethod = 'cash');
      context.read<ProfileBloc>().add(LoadProfile());
    } on PaymentFlowException catch (e) {
      if (mounted) CustomToast.show(context, e.message);
    }
  }

  @override
  void initState() {
    super.initState();
    context.read<WalletBloc>().add(LoadWalletDetails());
    // Always reload payment methods when entering booking
    context.read<ProfileBloc>().add(LoadProfile());

    final bookingState = context.read<BookingBloc>().state;
    if (bookingState is BookingVehicleOptionsLoaded) {
      _cachedOptions = bookingState;
      _evaluateAndPreselectPaymentMethod(bookingState.currencyCode);
    }
  }


  void _openPassengerSheet(BuildContext context) {
    PassengerDetailsSheet.show(
      context: context,
      initialPassenger: _passenger,
      initialNotes: _rideNotes,
      onSaved: (passenger, notes) {
        setState(() {
          _isBookingForSomeoneElse = true;
          _passenger = passenger;
          _rideNotes = notes;
        });
      },
    );
  }

  String _getVehicleAsset(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bike') ||
        lower.contains('moto') ||
        lower.contains('two')) {
      return 'assets/icons/bike.png';
    } else if (lower.contains('auto') || lower.contains('rickshaw')) {
      return 'assets/icons/auto.png';
    } else if (lower.contains('premium') ||
        lower.contains('xl') ||
        lower.contains('luxury')) {
      return 'assets/icons/premium-car.png';
    } else {
      return 'assets/icons/car.png';
    }
  }

  void _showInsufficientWalletSnackbar(
    BuildContext context,
    double walletBalance,
    double requiredAmount,
  ) {
    CustomToast.show(context, 'Not enough balance in your wallet');
  }

  void _showPaymentMethodSelector(
    BuildContext context,
    double walletBalance,
    String walletCurrency,
    String rideCurrency,
    double price,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final profileState = context.read<ProfileBloc>().state;
            List<dynamic> paymentMethods = [];
            if (profileState is ProfileLoaded) {
              paymentMethods =
                  profileState.userProfile['payment_methods'] as List? ?? [];
            }

            return DraggableScrollableSheet(
              initialChildSize: 0.5,
              minChildSize: 0.35,
              maxChildSize: 0.92,
              expand: false,
              builder: (_, scrollController) {
                return Column(
                  children: [
                    // Handle bar
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.only(left: 20, right: 20, bottom: 12),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Select Payment Method',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF021B47),
                          ),
                        ),
                      ),
                    ),
                    const Divider(height: 1),
                    Expanded(
                      child: ListView(
                        controller: scrollController,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        children: [
                          // Cash
                          _buildSheetOption(
                            ctx: ctx,
                            icon: Icons.payments_rounded,
                            title: 'Cash',
                            subtitle: 'Pay to driver after the ride',
                            isSelected: _paymentMethod == 'cash',
                            onTap: () {
                              setState(() => _paymentMethod = 'cash');
                              Navigator.pop(ctx);
                            },
                          ),
                          // Wallet
                          _buildSheetOption(
                            ctx: ctx,
                            icon: Icons.account_balance_wallet_rounded,
                            title: 'Ryva Wallet',
                            subtitle:
                                'Balance: ${AppConstants.getCurrencySymbol(walletCurrency)}${walletBalance.toStringAsFixed(2)}',
                            isSelected: _paymentMethod == 'wallet',
                            onTap: () {
                              if (walletCurrency.toUpperCase() !=
                                  rideCurrency.toUpperCase()) {
                                CustomToast.show(
                                  context,
                                  'Wallet currency does not match ride currency',
                                );
                              } else if (walletBalance < price) {
                                Navigator.pop(ctx);
                                _showInsufficientWalletSnackbar(
                                  context,
                                  walletBalance,
                                  price,
                                );
                              } else {
                                setState(() => _paymentMethod = 'wallet');
                                Navigator.pop(ctx);
                              }
                            },
                          ),
                          // Saved cards
                          if (paymentMethods.isNotEmpty) ...[
                            const Padding(
                              padding: EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 4),
                              child: Divider(height: 1),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(
                                  horizontal: 20, vertical: 6),
                              child: Text(
                                'SAVED CARDS',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF94A3B8),
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ),
                            for (final pm in paymentMethods) ...[
                              Builder(
                                builder: (_) {
                                  final isEligible = _isCardEligibleForCurrency(pm, rideCurrency);
                                  final reason = _getCardIneligibilityReason(pm, rideCurrency);

                                  return _buildCardSheetOption(
                                    ctx: ctx,
                                    pm: pm,
                                    isSelected: _paymentMethod == pm['id']?.toString(),
                                    isEligible: isEligible,
                                    ineligibilityReason: reason,
                                    onTap: () {
                                      if (!isEligible) {
                                        CustomToast.show(
                                          context,
                                          reason ?? 'This card cannot be used for this ride.',
                                        );
                                        return;
                                      }
                                      setState(() => _paymentMethod = pm['id']?.toString() ?? 'cash');
                                      Navigator.pop(ctx);
                                    },
                                    onDelete: () async {
                                      final id = pm['id']?.toString() ?? '';
                                      if (id.isEmpty) return;
                                      Navigator.pop(ctx);
                                      final confirm = await showDialog<bool>(
                                        context: context,
                                        builder: (d) => AlertDialog(
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(16)),
                                          title: const Text('Remove Card'),
                                          content: const Text(
                                              'Remove this saved payment method?'),
                                          actions: [
                                            TextButton(
                                              onPressed: () =>
                                                  Navigator.pop(d, false),
                                              child: const Text('Cancel'),
                                            ),
                                            TextButton(
                                              onPressed: () =>
                                                  Navigator.pop(d, true),
                                              child: const Text('Remove',
                                                  style: TextStyle(
                                                      color: Colors.red)),
                                            ),
                                          ],
                                        ),
                                      );
                                      if (confirm == true && mounted) {
                                        await _removeSavedCard(id);
                                      }
                                    },
                                  );
                                },
                              ),
                            ],
                          ],
                          const Padding(
                            padding: EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            child: Divider(height: 1),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 6),
                            child: Text(
                              rideCurrency.toUpperCase() == 'INR'
                                  ? 'ADD DOMESTIC CARD'
                                  : 'ADD INTERNATIONAL CARD',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF94A3B8),
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          // Gateway-specific Add Card action
                          if (rideCurrency.toUpperCase() == 'INR')
                            ListTile(
                              leading: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF009048).withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.credit_card_rounded,
                                  color: Color(0xFF009048),
                                  size: 22,
                                ),
                              ),
                              title: const Text(
                                'Add Card with Razorpay',
                                style: TextStyle(
                                  color: Color(0xFF021B47),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              subtitle: const Text(
                                'Indian debit/credit card (INR)',
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                              trailing: const Icon(
                                Icons.chevron_right_rounded,
                                color: Color(0xFF94A3B8),
                              ),
                              onTap: () {
                                _tokenizeCardOnBookingPage(
                                  gateway: 'razorpay',
                                  currency: rideCurrency,
                                  closeSheet: () => Navigator.pop(ctx),
                                );
                              },
                            )
                          else
                            ListTile(
                              leading: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.credit_card_rounded,
                                  color: Color(0xFF6366F1),
                                  size: 22,
                                ),
                              ),
                              title: Text(
                                'Add Card with Stripe (${rideCurrency.toUpperCase()})',
                                style: const TextStyle(
                                  color: Color(0xFF021B47),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              subtitle: const Text(
                                'International Visa, Mastercard, Amex',
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'Stripe',
                                  style: TextStyle(
                                    color: Color(0xFF6366F1),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                              onTap: () {
                                _tokenizeCardOnBookingPage(
                                  gateway: 'stripe',
                                  currency: rideCurrency,
                                  closeSheet: () => Navigator.pop(ctx),
                                );
                              },
                            ),
                          // Manage Saved Cards
                          ListTile(
                            leading: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0065B3).withValues(alpha: 0.08),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.settings_outlined,
                                color: Color(0xFF0065B3),
                                size: 20,
                              ),
                            ),
                            title: const Text(
                              'Manage Saved Cards',
                              style: TextStyle(
                                color: Color(0xFF0065B3),
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            onTap: () async {
                              Navigator.pop(ctx);
                              await context.push('/payment-methods');
                              if (mounted) {
                                context.read<ProfileBloc>().add(LoadProfile());
                                _evaluateAndPreselectPaymentMethod(rideCurrency);
                              }
                            },
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildSheetOption({
    required BuildContext ctx,
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF009048).withValues(alpha: 0.06)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFF009048)
                  : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isSelected
                      ? const Color(0xFF009048).withValues(alpha: 0.12)
                      : const Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon,
                    color: isSelected
                        ? const Color(0xFF009048)
                        : const Color(0xFF64748B),
                    size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? const Color(0xFF009048)
                              : const Color(0xFF021B47),
                        )),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(Icons.check_circle_rounded,
                    color: Color(0xFF009048), size: 22),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCardSheetOption({
    required BuildContext ctx,
    required Map<dynamic, dynamic> pm,
    required bool isSelected,
    required bool isEligible,
    required String? ineligibilityReason,
    required VoidCallback onTap,
    required VoidCallback onDelete,
  }) {
    final brand = (pm['cardBrand'] ?? pm['brand'] ?? 'Card')
        .toString()
        .toUpperCase();
    final last4 = pm['last4']?.toString() ?? '****';
    final gateway = pm['gateway']?.toString().toUpperCase() ?? '';
    final isDefault = pm['isDefault'] == true;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Opacity(
          opacity: isEligible ? 1.0 : 0.65,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFF009048).withValues(alpha: 0.06)
                  : (isEligible ? Colors.transparent : const Color(0xFFF8FAFC)),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isSelected
                    ? const Color(0xFF009048)
                    : (isEligible ? Colors.transparent : const Color(0xFFE2E8F0)),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFF009048).withValues(alpha: 0.12)
                        : const Color(0xFFF1F5F9),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.credit_card_rounded,
                      color: isSelected
                          ? const Color(0xFF009048)
                          : const Color(0xFF64748B),
                      size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              '$brand •••• $last4',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: isSelected
                                    ? const Color(0xFF009048)
                                    : const Color(0xFF021B47),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isDefault) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFF009048).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('Preferred', style: TextStyle(color: Color(0xFF009048), fontSize: 9, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      if (!isEligible && ineligibilityReason != null)
                        Text(
                          ineligibilityReason,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFFD97706),
                            fontWeight: FontWeight.w500,
                          ),
                        )
                      else if (gateway.isNotEmpty)
                        Text(
                          gateway,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                    ],
                  ),
                ),
                if (!isEligible)
                  Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Unavailable',
                      style: TextStyle(color: Color(0xFF92400E), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  )
                else if (isSelected)
                  const Icon(Icons.check_circle_rounded,
                      color: Color(0xFF009048), size: 22),
                GestureDetector(
                  onTap: onDelete,
                  child: Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Icon(
                    Icons.delete_outline_rounded,
                    color: Colors.redAccent.withValues(alpha: 0.8),
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

  @override
  Widget build(BuildContext context) {
    final walletState = context.watch<WalletBloc>().state;
    double walletBalance = 0.0;
    String walletCurrency = 'INR';
    if (walletState is WalletLoaded) {
      walletBalance = walletState.balance;
      walletCurrency = walletState.currency;
    }

    return PopScope(
      canPop: !_isConfirmStep,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _isConfirmStep) {
          setState(() {
            _isConfirmStep = false;
          });
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          title: Text(
            _isConfirmStep ? 'Confirm Your Ride' : 'Choose a ride',
            style: const TextStyle(
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
            onPressed: () {
              if (_isConfirmStep) {
                setState(() {
                  _isConfirmStep = false;
                });
              } else {
                context.read<BookingBloc>().add(ClearBooking());
                context.pop();
              }
            },
          ),
        ),
        body: BlocListener<ProfileBloc, ProfileState>(
          listener: (context, profileState) {
            if (profileState is ProfileLoaded) {
              final curr = _cachedOptions?.currencyCode ??
                  (context.read<BookingBloc>().state is BookingVehicleOptionsLoaded
                      ? (context.read<BookingBloc>().state as BookingVehicleOptionsLoaded).currencyCode
                      : 'INR');
              _evaluateAndPreselectPaymentMethod(curr);
            }
          },
          child: BlocConsumer<BookingBloc, BookingState>(
            listener: (context, state) {
              if (state is BookingVehicleOptionsLoaded) {
                setState(() {
                  _cachedOptions = state;
                });
                _evaluateAndPreselectPaymentMethod(state.currencyCode);
            } else if (state is BookingConfirmed) {
              setState(() {
                _isBooking = false;
              });
              context.read<RideTrackingBloc>().add(
                StartRideTracking(
                  rideId: state.rideId,
                  pickup: state.pickup,
                  pickupName: state.pickupName,
                  destination: state.destination,
                  destinationName: state.destinationName,
                  vehicleName: state.selectedVehicle.name,
                  fare: state.fare,
                  paymentMethod: state.paymentMethod,
                  passenger: state.passenger,
                  trackingUrl: state.trackingUrl,
                  currencyCode: _cachedOptions?.currencyCode ?? 'INR',
                  currencySymbol: _cachedOptions?.currencySymbol ?? '₹',
                  breakdown: state.selectedVehicle.breakdown,
                  distanceKm: state.selectedVehicle.distanceKm,
                  etaMin: state.selectedVehicle.etaMinutes,
                ),
              );
              context.go('/ride-tracking');
            } else if (state is BookingError) {
              setState(() {
                _isBooking = false;
              });
              CustomToast.show(context, state.message);
            }
          },
          builder: (context, state) {
            final effectiveState = (state is BookingVehicleOptionsLoaded)
                ? state
                : _cachedOptions;

            if (effectiveState == null && state is BookingLoading) {
              return const LoadingView();
            }

            if (state is BookingError ||
                (effectiveState == null && state is! BookingLoading)) {
              final errorMsg = state is BookingError
                  ? state.message
                  : 'No rides are currently available in this area.';
              return Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24.0,
                    vertical: 32.0,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE53935).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.no_crash_rounded,
                          color: Color(0xFFE53935),
                          size: 40,
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'No Rides Available',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF021B47),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        errorMsg,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF8A94A6),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 28),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () {
                            context.read<BookingBloc>().add(ClearBooking());
                            context.pop();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF009048),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                          ),
                          child: const Text(
                            'Choose Another Location',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            if (effectiveState != null) {
              final data = effectiveState;
              if (data.vehicles.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24.0,
                      vertical: 32.0,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: const Color(
                              0xFFE53935,
                            ).withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.no_crash_rounded,
                            color: Color(0xFFE53935),
                            size: 40,
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'No Rides Available',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF021B47),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'There are no drivers currently available for this route.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: Color(0xFF8A94A6),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 28),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: () {
                              context.read<BookingBloc>().add(ClearBooking());
                              context.pop();
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF009048),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                            ),
                            child: const Text(
                              'Choose Another Location',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return _isConfirmStep
                  ? _buildConfirmRideView(
                      context,
                      data,
                      walletBalance,
                      walletCurrency,
                    )
                  : _buildChooseRideView(
                      context,
                      data,
                      walletBalance,
                      walletCurrency,
                    );
            }

            return const LoadingView();
          },
        ),
      ),
    ),
  );
}

  // ===========================================================================
  // Rider Selector (For Me vs Someone Else)
  // ===========================================================================
  Widget _buildRiderSelector(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: const Color(0xFFE2E8F0),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              // For Me Tab
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (_isBookingForSomeoneElse) {
                      setState(() {
                        _isBookingForSomeoneElse = false;
                      });
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: !_isBookingForSomeoneElse
                          ? Colors.white
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(11),
                      boxShadow: !_isBookingForSomeoneElse
                          ? [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.person_rounded,
                          size: 17,
                          color: !_isBookingForSomeoneElse
                              ? const Color(0xFF009048)
                              : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'For Me',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: !_isBookingForSomeoneElse
                                ? FontWeight.bold
                                : FontWeight.w500,
                            color: !_isBookingForSomeoneElse
                                ? const Color(0xFF021B47)
                                : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Someone Else Tab
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isBookingForSomeoneElse = true;
                    });
                    if (_passenger == null) {
                      _openPassengerSheet(context);
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _isBookingForSomeoneElse
                          ? Colors.white
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(11),
                      boxShadow: _isBookingForSomeoneElse
                          ? [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.people_alt_rounded,
                          size: 17,
                          color: _isBookingForSomeoneElse
                              ? const Color(0xFF009048)
                              : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'For Someone Else',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: _isBookingForSomeoneElse
                                ? FontWeight.bold
                                : FontWeight.w500,
                            color: _isBookingForSomeoneElse
                                ? const Color(0xFF021B47)
                                : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Passenger Details Card (if Someone Else selected)
        if (_isBookingForSomeoneElse) ...[
          const SizedBox(height: 10),
          _passenger != null
              ? Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: const Color(0xFF009048).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(
                            0xFF009048,
                          ).withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.person_pin_rounded,
                          color: Color(0xFF009048),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    _passenger!.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: Color(0xFF021B47),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 1.5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF009048),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    _passenger!.passengerType.toUpperCase(),
                                    style: const TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_passenger!.phoneCountryCode} ${_passenger!.phoneNumber}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            if (_rideNotes != null &&
                                _rideNotes!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                'Note: "$_rideNotes"',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontStyle: FontStyle.italic,
                                  color: Color(0xFF475569),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          _openPassengerSheet(context);
                        },
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF0165B7),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Edit',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : InkWell(
                  onTap: () => _openPassengerSheet(context),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: const Color(0xFF009048),
                        width: 1.2,
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.add_circle_outline_rounded,
                          size: 18,
                          color: Color(0xFF009048),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Add Passenger Details',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF009048),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ],
      ],
    );
  }

  // ===========================================================================
  // Screen 2: Choose a ride (Available Ride Options)
  // ===========================================================================
  Widget _buildChooseRideView(
    BuildContext context,
    BookingVehicleOptionsLoaded state,
    double walletBalance,
    String walletCurrency,
  ) {
    final selectedPrice =
        state.calculatedFares[state.selectedVehicle.id] ??
        state.selectedVehicle.baseFare;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Who is riding selector (For Me vs Someone Else)
                _buildRiderSelector(context),
                const SizedBox(height: 14),

                // Vehicle Option Cards
                Column(
                  children: state.vehicles.map((vehicle) {
                    final isSelected = state.selectedVehicle.id == vehicle.id;
                    final price =
                        state.calculatedFares[vehicle.id] ?? vehicle.baseFare;
                    final origPrice =
                        (state.originalFares ??
                            state.calculatedFares)[vehicle.id] ??
                        vehicle.baseFare;
                    final bool hasDiscount =
                        state.appliedPromoCode != null && origPrice > price;
                    final assetPath = _getVehicleAsset(vehicle.name);

                    return InkWell(
                      onTap: () {
                        context.read<BookingBloc>().add(SelectVehicle(vehicle));
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF009048)
                                : const Color(0xFFE2E7E9),
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(
                                alpha: isSelected ? 0.04 : 0.02,
                              ),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // Vehicle Image
                            SizedBox(
                              width: 68,
                              height: 52,
                              child: Image.asset(
                                assetPath,
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) =>
                                    Container(
                                      width: 52,
                                      height: 52,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(
                                        Icons.directions_car_filled_rounded,
                                        color: Color(0xFF009048),
                                        size: 28,
                                      ),
                                    ),
                              ),
                            ),
                            const SizedBox(width: 14),

                            // Details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        vehicle.name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: Color(0xFF021B47),
                                        ),
                                      ),
                                      if (hasDiscount) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 5,
                                            vertical: 1,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFE8F5E9),
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                          child: Text(
                                            'Save ${state.currencySymbol}${(origPrice - price).toStringAsFixed(2)}',
                                            style: const TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF009048),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${vehicle.capacity} Passenger${vehicle.capacity > 1 ? 's' : ''}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF8A94A6),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Builder(
                                    builder: (context) {
                                      final int tripDuration =
                                          vehicle.durationInTrafficMin > 0
                                          ? vehicle.durationInTrafficMin
                                          : (vehicle.durationMin > 0
                                                ? vehicle.durationMin
                                                : state.durationMin);
                                      final double tripDist =
                                          vehicle.distanceKm > 0
                                          ? vehicle.distanceKm
                                          : state.distanceKm;
                                      return Text(
                                        '${vehicle.etaMinutes} min away • $tripDuration min (${tripDist.toStringAsFixed(1)} km)',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF8A94A6),
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ),

                            // Price and Radio
                            Row(
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    if (hasDiscount)
                                      Text(
                                        '${state.currencySymbol}${origPrice.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF8A94A6),
                                          decoration:
                                              TextDecoration.lineThrough,
                                        ),
                                      ),
                                    Text(
                                      '${state.currencySymbol}${price.toStringAsFixed(2)}',
                                      style: TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.bold,
                                        color: hasDiscount
                                            ? const Color(0xFF009048)
                                            : const Color(0xFF021B47),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  isSelected
                                      ? Icons.radio_button_checked
                                      : Icons.radio_button_off,
                                  color: isSelected
                                      ? const Color(0xFF009048)
                                      : Colors.grey.shade300,
                                  size: 20,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),

                // Promo / Coupon Banner on Choose Ride Step
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: state.appliedPromoCode != null
                          ? const Color(0xFF009048).withValues(alpha: 0.4)
                          : const Color(0xFFE2E7E9),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: state.appliedPromoCode != null
                      ? Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(7),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE8F5E9),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(
                                  Icons.check_circle_rounded,
                                  color: Color(0xFF009048),
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          state.appliedPromoCode!,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF009048),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 5,
                                            vertical: 1,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF009048),
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                          child: const Text(
                                            'APPLIED',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 1),
                                    Text(
                                      state.discountAmount != null &&
                                              state.discountAmount! > 0
                                          ? 'Discount of ${state.currencySymbol}${state.discountAmount!.toStringAsFixed(state.discountAmount! % 1 == 0 ? 0 : 2)} applied'
                                          : (state.promoDescription ??
                                                'Coupon applied'),
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF64748B),
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
                                  CustomToast.show(
                                    context,
                                    'Promo code removed',
                                  );
                                },
                                style: TextButton.styleFrom(
                                  foregroundColor: const Color(0xFFE53935),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: const Text(
                                  'Remove',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )
                      : InkWell(
                          onTap: () {
                            context.push('/promo-codes');
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(7),
                                  decoration: BoxDecoration(
                                    color: const Color(
                                      0xFF009048,
                                    ).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.local_offer_rounded,
                                    color: Color(0xFF009048),
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Have a promo code?',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF021B47),
                                        ),
                                      ),
                                      Text(
                                        'Apply coupon to get an instant discount',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF8A94A6),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Text(
                                  'Apply',
                                  style: TextStyle(
                                    color: Color(0xFF009048),
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(
                                  Icons.arrow_forward_ios_rounded,
                                  color: Color(0xFF009048),
                                  size: 12,
                                ),
                              ],
                            ),
                          ),
                        ),
                ),
                const SizedBox(height: 14),

                // Payment Method Section
                const Text(
                  'Payment Method',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                  ),
                ),
                const SizedBox(height: 10),

                if (_preferredUnavailableNotice != null) ...[
                  Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _preferredUnavailableNotice!,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                // 2 Payment options side-by-side replaced with Card Selector
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E7E9)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _paymentMethod.toLowerCase() == 'cash'
                            ? Icons.payments_rounded
                            : (_paymentMethod.toLowerCase() == 'wallet'
                                  ? Icons.account_balance_wallet_rounded
                                  : Icons.credit_card_rounded),
                        color: const Color(0xFF009048),
                        size: 22,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Builder(
                          builder: (context) {
                            String title = 'Cash';
                            String subtitle = 'Pay to driver';
                            final pmLower = _paymentMethod.toLowerCase();

                            if (pmLower == 'wallet') {
                              title = 'Wallet';
                              subtitle =
                                  'Balance: ${AppConstants.getCurrencySymbol(walletCurrency)}${walletBalance.toStringAsFixed(2)} ($walletCurrency)';
                            } else if (pmLower != 'cash') {
                              // Saved card — ID is a UUID, not pm_xxx
                              title = 'Saved Card';
                              subtitle = 'Pay securely via saved card';
                              // Try to find the card in profile
                              final profileState = context
                                  .read<ProfileBloc>()
                                  .state;
                              if (profileState is ProfileLoaded) {
                                final pms =
                                    profileState.userProfile['payment_methods']
                                        as List? ??
                                    [];
                                for (final pm in pms) {
                                  if (pm['id'] == _paymentMethod) {
                                    final brand = (pm['cardBrand'] ?? pm['brand'] ?? 'Card').toString().toUpperCase();
                                    title = '$brand •••• ${pm['last4'] ?? '****'}';
                                    subtitle = pm['gateway']?.toString().toUpperCase() ?? '';
                                    break;
                                  }
                                }
                              }
                            }

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF021B47),
                                  ),
                                ),
                                Text(
                                  subtitle,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF8A94A6),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          _showPaymentMethodSelector(
                            context,
                            walletBalance,
                            walletCurrency,
                            state.currencyCode,
                            selectedPrice,
                          );
                        },
                        child: const Text(
                          'Change',
                          style: TextStyle(
                            color: Color(0xFF0065B3),
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),

        // Bottom Continue Bar
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      if (_paymentMethod == 'wallet') {
                        if (walletCurrency.toUpperCase() !=
                            state.currencyCode.toUpperCase()) {
                          CustomToast.show(
                            context,
                            'Wallet currency (${walletCurrency.toUpperCase()}) does not match ride currency (${state.currencyCode.toUpperCase()})',
                          );
                          return;
                        }
                        if (walletBalance < selectedPrice) {
                          _showInsufficientWalletSnackbar(
                            context,
                            walletBalance,
                            selectedPrice,
                          );
                          return;
                        }
                      }
                      if (_isBookingForSomeoneElse && _passenger == null) {
                        CustomToast.show(
                          context,
                          'Please enter passenger details',
                        );
                        _openPassengerSheet(context);
                        return;
                      }
                      setState(() {
                        _isConfirmStep = true;
                      });
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
                      'Continue',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Builder(
                    builder: (context) {
                      final origPrice =
                          (state.originalFares ?? state.calculatedFares)[state
                              .selectedVehicle
                              .id] ??
                          state.selectedVehicle.baseFare;
                      final bool hasDiscount =
                          state.appliedPromoCode != null &&
                          origPrice > selectedPrice;
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (hasDiscount) ...[
                            Text(
                              '${state.currencySymbol}${origPrice.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF8A94A6),
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                            const SizedBox(width: 4),
                          ],
                          Text(
                            '${state.currencySymbol}${selectedPrice.toStringAsFixed(2)}',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: hasDiscount
                                  ? const Color(0xFF009048)
                                  : const Color(0xFF021B47),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  Builder(
                    builder: (context) {
                      final origPrice =
                          (state.originalFares ?? state.calculatedFares)[state
                              .selectedVehicle
                              .id] ??
                          state.selectedVehicle.baseFare;
                      final bool hasDiscount =
                          state.appliedPromoCode != null &&
                          origPrice > selectedPrice;
                      return Text(
                        hasDiscount
                            ? 'Total (Saved ${state.currencySymbol}${(origPrice - selectedPrice).toStringAsFixed(2)})'
                            : 'Total',
                        style: TextStyle(
                          fontSize: 11,
                          color: hasDiscount
                              ? const Color(0xFF009048)
                              : const Color(0xFF8A94A6),
                          fontWeight: hasDiscount
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Screen 3: Confirm Your Ride
  // ===========================================================================
  Widget _buildConfirmRideView(
    BuildContext context,
    BookingVehicleOptionsLoaded state,
    double walletBalance,
    String walletCurrency,
  ) {
    final selectedVeh = state.selectedVehicle;
    final price = state.calculatedFares[selectedVeh.id] ?? selectedVeh.baseFare;
    final origPrice =
        (state.originalFares ?? state.calculatedFares)[selectedVeh.id] ??
        selectedVeh.baseFare;
    final assetPath = _getVehicleAsset(selectedVeh.name);

    final double distanceKm = selectedVeh.distanceKm > 0
        ? selectedVeh.distanceKm
        : state.distanceKm;
    final int durationMin = selectedVeh.durationInTrafficMin > 0
        ? selectedVeh.durationInTrafficMin
        : (selectedVeh.durationMin > 0
              ? selectedVeh.durationMin
              : state.durationMin);

    final breakdown = selectedVeh.breakdown;
    double baseFare = 0.0;
    double distanceFare = 0.0;
    double timeFare = 0.0;
    double surgeFare = 0.0;
    double totalFees = 0.0;
    double totalTax = 0.0;
    String? surgeRuleName;
    bool isSurging = false;
    double surgeMultiplier = 1.0;

    if (breakdown != null) {
      final metered = breakdown['metered'] is Map
          ? breakdown['metered'] as Map
          : null;
      if (metered != null) {
        baseFare = ((metered['baseFareMinor'] as num? ?? 0) / 100.0).toDouble();
        distanceFare = ((metered['distanceFareMinor'] as num? ?? 0) / 100.0)
            .toDouble();
        timeFare = ((metered['timeFareMinor'] as num? ?? 0) / 100.0).toDouble();
      }

      final surge = breakdown['surge'] is Map
          ? breakdown['surge'] as Map
          : null;
      if (surge != null) {
        isSurging = surge['isSurging'] == true;
        surgeMultiplier = (surge['surgeMultiplier'] as num? ?? 1.0).toDouble();
        surgeFare = ((surge['surgeAmountMinor'] as num? ?? 0) / 100.0)
            .toDouble();
      }

      final rules = breakdown['rules'] is Map
          ? breakdown['rules'] as Map
          : null;
      if (rules != null &&
          rules['appliedRules'] is List &&
          (rules['appliedRules'] as List).isNotEmpty) {
        final firstRule = (rules['appliedRules'] as List).first is Map
            ? (rules['appliedRules'] as List).first as Map
            : null;
        surgeRuleName = firstRule?['name'] as String?;
      }

      final fees = breakdown['fees'] is Map ? breakdown['fees'] as Map : null;
      if (fees != null) {
        totalFees = ((fees['totalFeesMinor'] as num? ?? 0) / 100.0).toDouble();
      }

      final taxes = breakdown['taxes'] is Map
          ? breakdown['taxes'] as Map
          : null;
      if (taxes != null) {
        totalTax = ((taxes['totalTaxMinor'] as num? ?? 0) / 100.0).toDouble();
      }
    }

    if (baseFare == 0 && distanceFare == 0 && timeFare == 0) {
      baseFare = (origPrice * 0.60).clamp(20.0, origPrice);
      distanceFare = (origPrice * 0.25).clamp(5.0, origPrice);
      timeFare = (origPrice - baseFare - distanceFare).clamp(0.0, origPrice);
    }

    String fmt(double val) {
      return val.toStringAsFixed(2);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Selected Vehicle Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 68,
                  height: 52,
                  child: Image.asset(
                    assetPath,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFF009048).withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.directions_car_filled_rounded,
                        color: Color(0xFF009048),
                        size: 28,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        state.selectedVehicle.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF021B47),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${state.selectedVehicle.capacity} Passenger${state.selectedVehicle.capacity > 1 ? 's' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF8A94A6),
                        ),
                      ),
                    ],
                  ),
                ),
                Builder(
                  builder: (context) {
                    final origPrice =
                        (state.originalFares ??
                            state.calculatedFares)[state.selectedVehicle.id] ??
                        state.selectedVehicle.baseFare;
                    final bool hasDiscount =
                        state.appliedPromoCode != null && origPrice > price;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (hasDiscount)
                          Text(
                            '${state.currencySymbol}${fmt(origPrice)}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF8A94A6),
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        Text(
                          '${state.currencySymbol}${fmt(price)}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: hasDiscount
                                ? const Color(0xFF009048)
                                : const Color(0xFF021B47),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Passenger Details Card (when booking for someone else)
          if (_isBookingForSomeoneElse && _passenger != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: const Color(0xFF009048).withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF009048).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.people_alt_rounded,
                          color: Color(0xFF009048),
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'Riding on Behalf',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF021B47),
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => _openPassengerSheet(context),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF0165B7),
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Edit',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
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
                              _passenger!.name,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF021B47),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_passenger!.phoneCountryCode} ${_passenger!.phoneNumber} • ${_passenger!.passengerType[0].toUpperCase()}${_passenger!.passengerType.substring(1)}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (_rideNotes != null && _rideNotes!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.speaker_notes_outlined,
                            size: 14,
                            color: Color(0xFF64748B),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Note: ${_rideNotes!.trim()}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF475569),
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // 2. Route Summary Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFF009048),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Pickup',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF8A94A6),
                            ),
                          ),
                          Text(
                            state.pickupName.isNotEmpty
                                ? state.pickupName
                                : 'Pickup Location',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF021B47),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Row(
                    children: [
                      Container(
                        height: 18,
                        width: 2,
                        color: Colors.grey.shade300,
                      ),
                    ],
                  ),
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE53935),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Drop-off',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF8A94A6),
                            ),
                          ),
                          Text(
                            state.destinationName.isNotEmpty
                                ? state.destinationName
                                : 'Destination Location',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF021B47),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.near_me_rounded,
                      size: 14,
                      color: Color(0xFF8A94A6),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${distanceKm.toStringAsFixed(1)} km',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF8A94A6),
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Icon(
                      Icons.access_time_rounded,
                      size: 14,
                      color: Color(0xFF8A94A6),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$durationMin min',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF8A94A6),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. Fare Details Card
          const Text(
            'Fare Details',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF021B47),
            ),
          ),
          const SizedBox(height: 10),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Column(
              children: [
                _buildFareRow(
                  'Base Fare',
                  '${state.currencySymbol}${fmt(baseFare)}',
                ),
                const SizedBox(height: 8),
                _buildFareRow(
                  'Distance (${distanceKm.toStringAsFixed(1)} km)',
                  '${state.currencySymbol}${fmt(distanceFare)}',
                ),
                const SizedBox(height: 8),
                _buildFareRow(
                  'Time ($durationMin min)',
                  '${state.currencySymbol}${fmt(timeFare)}',
                ),
                if (surgeFare > 0 || (isSurging && surgeMultiplier > 1.0)) ...[
                  const SizedBox(height: 8),
                  _buildFareRow(
                    surgeRuleName != null
                        ? 'Surge ($surgeRuleName ${surgeMultiplier}x)'
                        : 'Peak Hour Surge (${surgeMultiplier}x)',
                    '+${state.currencySymbol}${fmt(surgeFare > 0 ? surgeFare : (origPrice * (surgeMultiplier - 1)))}',
                    color: const Color(0xFFE65100),
                  ),
                ],
                if (totalFees > 0) ...[
                  const SizedBox(height: 8),
                  _buildFareRow(
                    'Platform & Service Fees',
                    '+${state.currencySymbol}${fmt(totalFees)}',
                  ),
                ],
                if (totalTax > 0) ...[
                  const SizedBox(height: 8),
                  _buildFareRow(
                    'Taxes',
                    '+${state.currencySymbol}${fmt(totalTax)}',
                  ),
                ],
                if (state.discountAmount != null &&
                    state.discountAmount! > 0) ...[
                  const SizedBox(height: 8),
                  _buildFareRow(
                    'Promo Discount',
                    '-${state.currencySymbol}${fmt(state.discountAmount!)}',
                    color: const Color(0xFF009048),
                  ),
                ],
                const SizedBox(height: 10),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Total Fare',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF021B47),
                      ),
                    ),
                    Text(
                      '${state.currencySymbol}${fmt(price)}',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF009048),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Promo Code Row on Confirm Ride Screen
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: state.appliedPromoCode != null
                    ? const Color(0xFF009048).withValues(alpha: 0.4)
                    : const Color(0xFFE2E7E9),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  state.appliedPromoCode != null
                      ? Icons.check_circle_rounded
                      : Icons.local_offer_rounded,
                  color: const Color(0xFF009048),
                  size: 22,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () {
                      context.push('/promo-codes');
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              state.appliedPromoCode != null
                                  ? state.appliedPromoCode!
                                  : 'Promo Code',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: state.appliedPromoCode != null
                                    ? const Color(0xFF009048)
                                    : const Color(0xFF021B47),
                              ),
                            ),
                            if (state.appliedPromoCode != null) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 5,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF009048),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'APPLIED',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          state.appliedPromoCode != null
                              ? (state.discountAmount != null &&
                                        state.discountAmount! > 0
                                    ? 'Saved ${state.currencySymbol}${state.discountAmount!.toStringAsFixed(2)} on this ride'
                                    : (state.promoDescription ??
                                          'Promo applied'))
                              : 'Apply a promo code for discount',
                          style: TextStyle(
                            fontSize: 11,
                            color: state.appliedPromoCode != null
                                ? const Color(0xFF64748B)
                                : const Color(0xFF8A94A6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (state.appliedPromoCode != null)
                  TextButton(
                    onPressed: () {
                      context.read<BookingBloc>().add(RemovePromoCode());
                      CustomToast.show(context, 'Promo code removed');
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFE53935),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Remove',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                else
                  IconButton(
                    onPressed: () {
                      context.push('/promo-codes');
                    },
                    icon: const Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: Color(0xFF8A94A6),
                      size: 16,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. Payment Method Card
          const Text(
            'Payment Method',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF021B47),
            ),
          ),
          if (_preferredUnavailableNotice != null) ...[
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _preferredUnavailableNotice!,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                    ),
                  ),
                ],
              ),
            ),
          ],
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Row(
              children: [
                Icon(
                  _paymentMethod == 'cash'
                      ? Icons.payments_rounded
                      : (_paymentMethod == 'wallet'
                            ? Icons.account_balance_wallet_rounded
                            : Icons.credit_card_rounded),
                  color: const Color(0xFF009048),
                  size: 22,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Builder(
                    builder: (context) {
                      String title = 'Cash';
                      String subtitle = 'Pay to driver';

                      if (_paymentMethod == 'wallet') {
                        title = 'Wallet';
                        subtitle =
                            'Balance: ${AppConstants.getCurrencySymbol(walletCurrency)}${walletBalance.toStringAsFixed(2)} ($walletCurrency)';
                      } else if (_paymentMethod != 'cash') {
                        // Saved card — ID is a UUID, not pm_xxx
                        title = 'Saved Card';
                        subtitle = 'Pay securely via saved card';
                        // Try to find the card in profile
                        final profileState = context.read<ProfileBloc>().state;
                        if (profileState is ProfileLoaded) {
                          final pms =
                              profileState.userProfile['payment_methods']
                                  as List? ??
                              [];
                          for (final pm in pms) {
                            if (pm['id'] == _paymentMethod) {
                              final brand = (pm['cardBrand'] ?? pm['brand'] ?? 'Card').toString().toUpperCase();
                              title = '$brand •••• ${pm['last4'] ?? '****'}';
                              subtitle = pm['gateway']?.toString().toUpperCase() ?? '';
                              break;
                            }
                          }
                        }
                      }

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF021B47),
                            ),
                          ),
                          Text(
                            subtitle,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF8A94A6),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                TextButton(
                  onPressed: () {
                    _showPaymentMethodSelector(
                      context,
                      walletBalance,
                      walletCurrency,
                      state.currencyCode,
                      price,
                    );
                  },
                  child: const Text(
                    'Change',
                    style: TextStyle(
                      color: Color(0xFF0065B3),
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 5. Confirm & Book Primary Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isBooking
                  ? null
                  : () {
                      final chosenMethod = _paymentMethod;
                      if (chosenMethod == 'wallet') {
                        if (walletCurrency.toUpperCase() !=
                            state.currencyCode.toUpperCase()) {
                          CustomToast.show(
                            context,
                            'Wallet currency (${walletCurrency.toUpperCase()}) does not match ride currency (${state.currencyCode.toUpperCase()})',
                          );
                          return;
                        }
                        if (walletBalance < price) {
                          _showInsufficientWalletSnackbar(
                            context,
                            walletBalance,
                            price,
                          );
                          return;
                        }
                      }
                      if (_isBookingForSomeoneElse && _passenger == null) {
                        CustomToast.show(
                          context,
                          'Please enter passenger details',
                        );
                        _openPassengerSheet(context);
                        return;
                      }
                      setState(() { _isBooking = true; });
                      context.read<BookingBloc>().add(
                        ConfirmRideBooking(
                          paymentMethod: chosenMethod,
                          passenger: _isBookingForSomeoneElse ? _passenger : null,
                          notes: _isBookingForSomeoneElse ? _rideNotes : null,
                        ),
                      );
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: _isBooking
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Text(
                      'Confirm & Book',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),

          Center(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isConfirmStep = false;
                });
              },
              child: const Text(
                'Cancel Ride',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFE53935),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFareRow(
    String title,
    String amount, {
    Color color = const Color(0xFF021B47),
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6)),
        ),
        Text(
          amount,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}
