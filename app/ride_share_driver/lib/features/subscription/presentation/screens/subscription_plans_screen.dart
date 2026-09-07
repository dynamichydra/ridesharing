import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
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
        setState(() => _isProcessing = false);
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
        setState(() => _isProcessing = false);
        CustomToast.show(context, 'Payment was not completed.');
        _bloc.add(PurchaseCancelled());
      }
    }
  }

  // ── CONFIRMATION BOTTOM SHEET (Matches Right Mockup) ────────────────────────
  void _confirmSubscribe(SubscriptionPlan plan) {
    final theme = _resolveTheme(plan, 0);
    final sym = _formatCurrencySymbol(plan.currencyCode);
    final formattedPrice = _formatPrice(plan.priceMajor);
    final isTrial = plan.trialDays > 0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header: Icon + Plan Name + Badge + Subtitle
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.lightBg,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(theme.icon, color: theme.primary, size: 26),
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
                                plan.name,
                                style: const TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                            ),
                            if (theme.badgeText != null) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: theme.badgeBg ?? const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  theme.badgeText!,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: theme.badgeTextColor ?? const Color(0xFF2563EB),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          theme.subtitle,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Large Price Section
              Text(
                '$sym$formattedPrice',
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                _formatDurationLabel(plan).replaceAll('\n', ' '),
                style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
              ),

              const SizedBox(height: 18),
              Divider(color: Colors.grey.shade200, height: 1),
              const SizedBox(height: 20),

              // Feature rows with clean custom icons matching card theme
              _buildSheetFeatureRow(
                Icons.calendar_today_outlined,
                plan.durationDays != null ? '${plan.durationDays} days duration' : 'Lifetime access',
                color: theme.primary,
              ),
              _buildSheetFeatureRow(
                Icons.all_inclusive_rounded,
                plan.maxRidesPerDay != null ? '${plan.maxRidesPerDay} rides per day' : 'Unlimited rides',
                color: theme.primary,
              ),
              _buildSheetFeatureRow(
                Icons.percent_rounded,
                '0% commission',
                color: theme.primary,
              ),
              if (plan.priorityMatching)
                _buildSheetFeatureRow(
                  Icons.bolt_rounded,
                  'Priority matching',
                  color: theme.primary,
                ),
              _buildSheetFeatureRow(
                Icons.headset_mic_outlined,
                plan.features.any((f) => f.toLowerCase().contains('24/7')) ? '24/7 support' : 'Basic support',
                color: theme.primary,
              ),
              ...plan.features
                  .where((f) =>
                      !f.toLowerCase().contains('commission') &&
                      !f.toLowerCase().contains('unlimited rides') &&
                      !f.toLowerCase().contains('priority matching') &&
                      !f.toLowerCase().contains('support'))
                  .map((f) => _buildSheetFeatureRow(Icons.check_circle_outline_rounded, f, color: theme.primary)),

              // Free trial banner callout
              if (isTrial) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.card_giftcard_rounded, color: Color(0xFFD97706), size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Start with ${plan.trialDays}-day free trial',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'No charges for the first ${plan.trialDays} days.',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Group discount banner
              if (plan.hasDiscount && plan.originalPriceMajor != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.local_offer_rounded, color: Color(0xFF059669), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Save $sym${_formatPrice(plan.originalPriceMajor! - plan.priceMajor)} with ${plan.specialOfferGroupName ?? 'special offer'}!',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF065F46)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),

              // Action button (Matches Card Color)
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.buttonBg,
                    foregroundColor: theme.buttonTextColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.pop(sheetCtx);
                    _bloc.add(PurchasePlanRequested(planId: plan.id));
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isTrial ? 'Start Free Trial' : 'Proceed to Pay & Activate',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, size: 20),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 6),

              // Cancel button
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(sheetCtx),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSheetFeatureRow(IconData icon, String label, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color ?? const Color(0xFF008744)),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF1E293B),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final isMandatory = authState is Authenticated && authState.driver.isNeverSubscribed;
    final canPop = Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: BlocConsumer<SubscriptionBloc, SubscriptionState>(
          bloc: _bloc,
          listener: (context, state) {
            if (state is PlansLoaded) {
              setState(() {
                _plans = state.plans;
                _activeSubscription = state.activeSubscription;
                _loadError = null;
                _isProcessing = false;
              });
            } else if (state is PlansLoadFailed) {
              setState(() {
                _loadError = state.message;
                _isProcessing = false;
              });
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
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    children: [
                      // 1. Clean Custom Header matching mockup
                      _buildHeader(canPop: canPop, isMandatory: isMandatory),
                      const SizedBox(height: 12),

                      // Optional Active Subscription status banner if driver already has an active sub
                      if (_activeSubscription != null && _activeSubscription!.isActive) ...[
                        _buildCurrentPlanHero(_activeSubscription!),
                        const SizedBox(height: 16),
                      ],

                      // 2. Plans List
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
                            padding: const EdgeInsets.only(bottom: 16),
                            child: _buildPlanCard(plan, index, isCurrentActive: isCurrentActive),
                          );
                        }),
                    ],
                  ),
                ),
                if (_isProcessing)
                  Container(
                    color: Colors.black.withValues(alpha: 0.25),
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
      ),
    );
  }

  // ── HEADER (Back Arrow + "Driver Plans" Title + Subtitle) ───────────────────
  Widget _buildHeader({required bool canPop, required bool isMandatory}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (canPop)
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A), size: 24),
                onPressed: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  } else {
                    context.go('/dashboard');
                  }
                },
              )
            else
              const SizedBox(width: 24),
            if (isMandatory)
              IconButton(
                icon: const Icon(Icons.logout_rounded, color: Color(0xFF0F172A)),
                onPressed: widget.onLogout,
                tooltip: 'Logout',
              ),
          ],
        ),
        const SizedBox(height: 10),
        const Text(
          'Driver Plans',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Get more rides. Keep more of your earnings.',
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.normal,
          ),
        ),
      ],
    );
  }

  // ── PLAN CARD (Faithful to Left Mockup) ──────────────────────────────────────
  Widget _buildPlanCard(SubscriptionPlan plan, int index, {bool isCurrentActive = false}) {
    final theme = _resolveTheme(plan, index);
    final sym = _formatCurrencySymbol(plan.currencyCode);
    final formattedPrice = _formatPrice(plan.priceMajor);
    final metrics = _buildMetrics(plan);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isCurrentActive ? const Color(0xFF008744) : const Color(0xFFE2E8F0),
          width: isCurrentActive ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Icon + Title/Badge/Subtitle + Price/Duration
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.lightBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(theme.icon, color: theme.primary, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            plan.name,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        if (theme.badgeText != null) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: theme.badgeBg ?? const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              theme.badgeText!,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: theme.badgeTextColor ?? const Color(0xFF2563EB),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      theme.subtitle,
                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '$sym$formattedPrice',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatDurationLabel(plan),
                    textAlign: TextAlign.end,
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.2),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Middle Row: 3 Highlight Metric Pills
          Row(
            children: metrics.map((m) {
              return Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(m.icon, size: 18, color: const Color(0xFF008744)),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              m.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              m.subtitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),

          // Features Checklist
          if (plan.features.isNotEmpty) ...[
            const SizedBox(height: 14),
            ...plan.features.take(4).map((f) => Padding(
                  padding: const EdgeInsets.only(bottom: 5),
                  child: Row(
                    children: [
                      const Icon(Icons.check, size: 15, color: Color(0xFF008744)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          f,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF334155),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
          ],

          const SizedBox(height: 16),

          // Button ("Select Plan →")
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: isCurrentActive ? const Color(0xFF008744) : theme.buttonBg,
                foregroundColor: isCurrentActive ? Colors.white : theme.buttonTextColor,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: isCurrentActive ? null : () => _confirmSubscribe(plan),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isCurrentActive ? 'Current Active Plan' : 'Select Plan',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  if (!isCurrentActive) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 18),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── ACTIVE PLAN BANNER (Shown if driver already has an active sub) ───────────
  Widget _buildCurrentPlanHero(ActiveSubscription sub) {
    final days = sub.daysRemaining;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFD1FAE5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.check_circle_rounded, color: Color(0xFF008744), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sub.plan?.name ?? 'Active Driver Plan',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF065F46)),
                ),
                Text(
                  days != null ? '$days days remaining • Full ride matching active' : 'Lifetime access active',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF047857)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── ERROR / MESSAGE ────────────────────────────────────────────────────────
  String _cleanErrorMessage(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('failed query') ||
        lower.contains('syntax error') ||
        lower.contains('column') ||
        lower.contains('does not exist') ||
        lower.contains('undefined')) {
      return 'Unable to load subscription plans at this time. Please check your connection or tap Retry.';
    }
    return raw;
  }

  Widget _buildMessage(String text, {VoidCallback? onRetry}) {
    final cleanText = _cleanErrorMessage(text);
    return Center(
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline_rounded, size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 12),
            Text(
              cleanText,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.4),
            ),
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

// ── COLOR THEMES & PALETTES MATCHING MOCKUP ─────────────────────────────────
class _PlanTheme {
  final Color primary;
  final Color lightBg;
  final Color buttonBg;
  final Color buttonTextColor;
  final IconData icon;
  final String subtitle;
  final String? badgeText;
  final Color? badgeBg;
  final Color? badgeTextColor;

  const _PlanTheme({
    required this.primary,
    required this.lightBg,
    required this.buttonBg,
    required this.buttonTextColor,
    required this.icon,
    required this.subtitle,
    this.badgeText,
    this.badgeBg,
    this.badgeTextColor,
  });
}

_PlanTheme _resolveTheme(SubscriptionPlan plan, int index) {
  final type = plan.type.toLowerCase();
  final name = plan.name.toLowerCase();

  if (type == 'weekly' || name.contains('week') || name.contains('trial')) {
    return _PlanTheme(
      primary: const Color(0xFF008744),
      lightBg: const Color(0xFFECFDF5),
      buttonBg: const Color(0xFF008744),
      buttonTextColor: Colors.white,
      icon: Icons.calendar_today_outlined,
      subtitle: 'Perfect to get started',
      badgeText: plan.trialDays > 0 ? '${plan.trialDays}-day free trial' : null,
      badgeBg: const Color(0xFFEFF6FF),
      badgeTextColor: const Color(0xFF2563EB),
    );
  } else if (type == 'monthly' || name.contains('month')) {
    return _PlanTheme(
      primary: const Color(0xFF2563EB),
      lightBg: const Color(0xFFEFF6FF),
      buttonBg: const Color(0xFF2563EB),
      buttonTextColor: Colors.white,
      icon: Icons.calendar_month_outlined,
      subtitle: 'Most popular plan for drivers',
      badgeText: plan.trialDays > 0 ? '${plan.trialDays}-day free trial' : null,
      badgeBg: const Color(0xFFEFF6FF),
      badgeTextColor: const Color(0xFF2563EB),
    );
  } else if (type == 'quarterly' ||
      name.contains('quarter') ||
      (plan.durationDays != null && plan.durationDays! >= 80 && plan.durationDays! <= 100)) {
    return const _PlanTheme(
      primary: Color(0xFFD97706),
      lightBg: Color(0xFFFFFBEB),
      buttonBg: Color(0xFFF59E0B),
      buttonTextColor: Color(0xFF1F2937),
      icon: Icons.calendar_month_outlined,
      subtitle: 'More value, more savings',
    );
  } else if (type == 'yearly' || name.contains('year') || (plan.durationDays != null && plan.durationDays! >= 300)) {
    return const _PlanTheme(
      primary: Color(0xFF008744),
      lightBg: Color(0xFFECFDF5),
      buttonBg: Color(0xFF008744),
      buttonTextColor: Colors.white,
      icon: Icons.calendar_month_outlined,
      subtitle: 'Maximum savings',
      badgeText: 'Best value',
      badgeBg: Color(0xFFDCFCE7),
      badgeTextColor: Color(0xFF15803D),
    );
  } else if (type == 'lifetime' || name.contains('life') || plan.durationDays == null) {
    return const _PlanTheme(
      primary: Color(0xFFD97706),
      lightBg: Color(0xFFFEF3C7),
      buttonBg: Color(0xFFD97706),
      buttonTextColor: Colors.white,
      icon: Icons.workspace_premium_rounded,
      subtitle: 'One-time payment. Ride forever.',
    );
  }

  final isEven = index % 2 == 0;
  return _PlanTheme(
    primary: isEven ? const Color(0xFF2563EB) : const Color(0xFF008744),
    lightBg: isEven ? const Color(0xFFEFF6FF) : const Color(0xFFECFDF5),
    buttonBg: isEven ? const Color(0xFF2563EB) : const Color(0xFF008744),
    buttonTextColor: Colors.white,
    icon: Icons.calendar_today_outlined,
    subtitle: plan.durationDays != null ? 'Valid for ${plan.durationDays} days' : 'Unlimited access',
  );
}

// ── DURATION & PRICE FORMATTERS ─────────────────────────────────────────────
String _formatDurationLabel(SubscriptionPlan plan) {
  final sym = _formatCurrencySymbol(plan.currencyCode);
  final type = plan.type.toLowerCase();
  final days = plan.durationDays;
  final price = plan.priceMajor;

  if (type == 'weekly' || (days != null && days == 7)) {
    return 'for 7 days';
  } else if (type == 'monthly' || (days != null && days == 30)) {
    return 'per month';
  } else if (type == 'quarterly' || (days != null && days >= 80 && days <= 100)) {
    final perMonth = (price / 3).round();
    return 'for 3 months\n($sym$perMonth per month)';
  } else if (type == 'yearly' || (days != null && days >= 360)) {
    final perMonth = (price / 12).round();
    return 'per year\n($sym$perMonth per month)';
  } else if (type == 'lifetime' || days == null) {
    return 'one-time';
  } else {
    return 'for $days days';
  }
}

String _formatCurrencySymbol(String currencyCode) {
  switch (currencyCode.toUpperCase()) {
    case 'INR':
      return '₹';
    case 'USD':
      return '\$';
    case 'CAD':
      return 'CA\$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return '$currencyCode ';
  }
}

String _formatPrice(num price) {
  final intVal = price.toInt();
  if (price == intVal) {
    return intVal.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
  return price.toStringAsFixed(2);
}

// ── 3 METRIC PILLS PER PLAN ──────────────────────────────────────────────────
class _MetricItem {
  final IconData icon;
  final String title;
  final String subtitle;

  const _MetricItem({required this.icon, required this.title, required this.subtitle});
}

List<_MetricItem> _buildMetrics(SubscriptionPlan plan) {
  // 1. Rides
  final _MetricItem rideItem;
  if (plan.maxRidesPerDay != null && plan.maxRidesPerDay! > 0) {
    rideItem = _MetricItem(
      icon: Icons.directions_car_outlined,
      title: '${plan.maxRidesPerDay}',
      subtitle: 'Rides/day',
    );
  } else {
    rideItem = const _MetricItem(
      icon: Icons.all_inclusive_rounded,
      title: 'Unlimited',
      subtitle: 'Rides',
    );
  }

  // 2. Commission
  const _MetricItem commissionItem = _MetricItem(
    icon: Icons.percent_rounded,
    title: '0%',
    subtitle: 'Commission',
  );

  // 3. Support / Matching
  final _MetricItem thirdItem;
  if (plan.priorityMatching) {
    thirdItem = const _MetricItem(
      icon: Icons.bolt_rounded,
      title: 'Priority',
      subtitle: 'Matching',
    );
  } else if (plan.features.any((f) => f.toLowerCase().contains('24/7'))) {
    thirdItem = const _MetricItem(
      icon: Icons.headset_mic_outlined,
      title: '24/7',
      subtitle: 'Support',
    );
  } else {
    thirdItem = const _MetricItem(
      icon: Icons.headset_mic_outlined,
      title: 'Basic',
      subtitle: 'Support',
    );
  }

  return [rideItem, commissionItem, thirdItem];
}
