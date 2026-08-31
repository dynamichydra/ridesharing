import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../style/appcolors.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../domain/entities/subscription_plan.dart';
import '../../domain/entities/active_subscription.dart';
import '../bloc/subscription_bloc.dart';
import '../checkout/razorpay_checkout_launcher.dart';
import '../checkout/stripe_checkout_launcher.dart';

class SubscriptionPlansScreen extends StatefulWidget {
  final String countryId;
  final VoidCallback onSubscribed;
  final VoidCallback onLogout;

  const SubscriptionPlansScreen({
    super.key,
    required this.countryId,
    required this.onSubscribed,
    required this.onLogout,
  });

  @override
  State<SubscriptionPlansScreen> createState() => _SubscriptionPlansScreenState();
}

class _SubscriptionPlansScreenState extends State<SubscriptionPlansScreen> {
  late final SubscriptionBloc _bloc = di.sl<SubscriptionBloc>();
  List<SubscriptionPlan>? _plans;
  ActiveSubscription? _activeSubscription;
  String? _loadError;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _bloc.add(LoadSubscriptionOverview(countryId: widget.countryId));
  }

  Future<void> _launchCheckout(SubscriptionState state) async {
    if (state is RazorpayCheckoutReady) {
      final result = await RazorpayCheckoutLauncher().checkout(
        keyId: state.data.keyId,
        gatewayOrderId: state.data.gatewayOrderId,
        amountMinor: state.data.amountMinor,
        currencyCode: state.data.currencyCode,
        description: state.data.planName,
      );
      if (!mounted) return;
      if (result.success) {
        _bloc.add(VerifyPurchaseRequested(
          planId: state.planId,
          orderRef: result.orderId!,
          paymentRef: result.paymentId!,
          signature: result.signature,
        ));
      } else {
        CustomToast.show(context, result.errorMessage ?? 'Payment was not completed.');
        _bloc.add(PurchaseCancelled());
      }
    } else if (state is StripeCheckoutReady) {
      final success = await StripeCheckoutLauncher().checkout(
        clientSecret: state.data.clientSecret,
        publishableKey: state.data.publishableKey,
      );
      if (!mounted) return;
      if (success) {
        _bloc.add(VerifyPurchaseRequested(
          planId: state.planId,
          orderRef: state.data.gatewayOrderId,
          paymentRef: state.data.gatewayOrderId,
        ));
      } else {
        CustomToast.show(context, 'Payment was not completed.');
        _bloc.add(PurchaseCancelled());
      }
    }
  }

  void _confirmSubscribe(SubscriptionPlan plan) {
    final priceMajor = plan.priceMinor / 100;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.star_rounded, color: AppColors.secondary, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Confirm Subscription',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      Text(
                        plan.name,
                        style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Plan Duration', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                      Text(
                        plan.durationDays != null ? '${plan.durationDays} Days' : 'Lifetime Access',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Amount Payable', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                      Text(
                        '${plan.currencyCode} ${priceMajor.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.secondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.secondary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                onPressed: () {
                  Navigator.pop(sheetCtx);
                  _bloc.add(PurchasePlanRequested(planId: plan.id));
                },
                child: const Text('Proceed to Pay & Activate', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Driver Subscription & Plans', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        centerTitle: true,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: BlocConsumer<SubscriptionBloc, SubscriptionState>(
        bloc: _bloc,
        listener: (context, state) {
          if (state is PlansLoaded) {
            setState(() {
              _plans = state.plans;
              _activeSubscription = state.activeSubscription;
              _loadError = null;
            });
          } else if (state is PlansLoadFailed) {
            setState(() => _loadError = state.message);
          } else if (state is PurchaseInProgress) {
            setState(() => _isProcessing = true);
          } else if (state is RazorpayCheckoutReady || state is StripeCheckoutReady) {
            _launchCheckout(state);
          } else if (state is PurchaseFailed) {
            setState(() => _isProcessing = false);
            CustomToast.show(context, state.message);
          } else if (state is PurchaseSucceeded) {
            setState(() => _isProcessing = false);
            CustomToast.show(context, 'Subscription activated successfully!');
            context.read<AuthBloc>().add(CheckAuthStatus());
            widget.onSubscribed();
            _bloc.add(LoadSubscriptionOverview(countryId: widget.countryId));
          }
        },
        builder: (context, state) {
          if (_loadError != null) {
            return _buildMessage(
              _loadError!,
              onRetry: () => _bloc.add(LoadSubscriptionOverview(countryId: widget.countryId)),
            );
          }
          if (_plans == null) {
            return const Center(child: CircularProgressIndicator(color: AppColors.secondary));
          }

          return Stack(
            children: [
              RefreshIndicator(
                onRefresh: () async {
                  _bloc.add(LoadSubscriptionOverview(countryId: widget.countryId));
                },
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // 1. Hero Card: Current Plan Status (Active / Expired / None)
                    _buildCurrentPlanHero(_activeSubscription),
                    const SizedBox(height: 20),

                    // 2. Section Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _activeSubscription != null && _activeSubscription!.isActive
                              ? 'Upgrade / Extend Plan'
                              : 'Available Subscription Plans',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (_plans!.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.secondary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${_plans!.length} Plans',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.secondary,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (_plans!.isEmpty)
                      _buildMessage('No subscription plans are available currently in your region.')
                    else
                      ..._plans!.asMap().entries.map((entry) {
                        final index = entry.key;
                        final plan = entry.value;
                        final isCurrentActive = _activeSubscription != null &&
                            _activeSubscription!.isActive &&
                            _activeSubscription!.planId == plan.id;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildPlanCard(plan, index, isCurrentActive: isCurrentActive),
                        );
                      }),

                    const SizedBox(height: 16),
                    // 3. Driver Benefits
                    _buildDriverBenefitsCard(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
              if (_isProcessing)
                Container(
                  color: Colors.black.withOpacity(0.2),
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: AppColors.secondary),
                        SizedBox(height: 16),
                        Text(
                          'Processing Subscription...',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  // ── HERO CARD: ACTIVE / EXPIRED STATUS ────────────────────────────────────────
  Widget _buildCurrentPlanHero(ActiveSubscription? sub) {
    final bool hasActive = sub != null && sub.isActive;
    final bool isExpired = sub != null && sub.isExpired;

    if (hasActive) {
      final days = sub.daysRemaining;
      final endDateStr = sub.endDate != null
          ? '${DateTime.tryParse(sub.endDate!)?.day ?? ''}/${DateTime.tryParse(sub.endDate!)?.month ?? ''}/${DateTime.tryParse(sub.endDate!)?.year ?? ''}'
          : 'Lifetime';

      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF009048), Color(0xFF006834)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF009048).withOpacity(0.25),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, color: Colors.white, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'ACTIVE SUBSCRIBER',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                      ),
                    ],
                  ),
                ),
                Text(
                  days != null ? '$days Days Left' : 'Lifetime',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              sub.plan?.name ?? 'Active Driver Plan',
              style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Valid until: $endDateStr • Full ride matching enabled',
              style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13),
            ),
          ],
        ),
      );
    }

    if (isExpired) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFCA5A5), width: 1.5),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 28),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Subscription Expired',
                    style: TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'You cannot accept ride requests. Please renew or upgrade a plan below.',
                    style: TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // No active subscription
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.lock_clock_rounded, color: AppColors.secondary, size: 26),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'No Active Subscription',
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                ),
                SizedBox(height: 2),
                Text(
                  'Select a plan below to start receiving passenger ride requests.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── PLAN CARD ────────────────────────────────────────────────────────────────
  Widget _buildPlanCard(SubscriptionPlan plan, int index, {bool isCurrentActive = false}) {
    final priceMajor = plan.priceMinor / 100;
    final isEven = index % 2 == 0;
    final mainColor = isEven ? AppColors.secondary : AppColors.primary;
    final accentColor = isEven ? AppColors.primary : AppColors.secondary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isCurrentActive ? const Color(0xFF009048) : AppColors.border,
          width: isCurrentActive ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                plan.name,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              Text(
                '${plan.currencyCode} ${priceMajor.toStringAsFixed(2)}',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: isCurrentActive ? const Color(0xFF009048) : mainColor),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            plan.durationDays != null ? '${plan.durationDays} Days Duration' : 'Lifetime Access',
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          if (plan.features.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...plan.features.map((f) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Icon(Icons.check_circle_rounded, size: 16, color: accentColor),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(f, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      ),
                    ],
                  ),
                )),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: isCurrentActive ? const Color(0xFF009048) : mainColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              onPressed: isCurrentActive ? null : () => _confirmSubscribe(plan),
              child: Text(
                isCurrentActive ? 'Current Active Plan' : 'Select Plan',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── DRIVER BENEFITS ─────────────────────────────────────────────────────────
  Widget _buildDriverBenefitsCard() {
    final benefits = [
      {'icon': Icons.money_off_rounded, 'title': '0% Commission', 'desc': 'Keep 100% of your earned trip fares.'},
      {'icon': Icons.gps_fixed_rounded, 'title': 'Unlimited Ride Matching', 'desc': 'Receive trip offers everywhere in your city.'},
      {'icon': Icons.speed_rounded, 'title': 'Instant Daily Payouts', 'desc': 'Withdraw earnings directly to your bank account.'},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Partner Benefits Included',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 12),
          ...benefits.map((b) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(b['icon'] as IconData, color: AppColors.secondary, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(b['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                          Text(b['desc'] as String, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildMessage(String text, {VoidCallback? onRetry}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline_rounded, size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 12),
            Text(text, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: onRetry,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white),
                child: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
