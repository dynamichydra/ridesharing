import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../style/appcolors.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../domain/entities/subscription_plan.dart';
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
  String? _loadError;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _bloc.add(LoadPlans(countryId: widget.countryId));
  }

  @override
  void dispose() {
    super.dispose();
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
        // Stripe has no separate order/payment/signature triad — the backend
        // re-checks the PaymentIntent status server-side using orderRef alone.
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Subscription Plans', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
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
            // Refresh the driver profile so the router picks up the new
            // subscriptionStatus and redirects to the dashboard on its own.
            context.read<AuthBloc>().add(CheckAuthStatus());
            widget.onSubscribed();
          }
        },
        builder: (context, state) {
          if (_loadError != null) {
            return _buildMessage(
              _loadError!,
              onRetry: () => _bloc.add(LoadPlans(countryId: widget.countryId)),
            );
          }
          if (_plans == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (_plans!.isEmpty) {
            return _buildMessage('No subscription plans are available yet. Please contact support.');
          }

          return Stack(
            children: [
              ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _plans!.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) => _buildPlanCard(_plans![index], index),
              ),
              if (_isProcessing)
                Container(
                  color: Colors.black.withOpacity(0.15),
                  child: const Center(child: CircularProgressIndicator()),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPlanCard(SubscriptionPlan plan, int index) {
    final priceMajor = plan.priceMinor / 100;
    final unsupportedGateway = plan.gateway != null && plan.gateway != 'razorpay' && plan.gateway != 'stripe';

    // Map plans dynamically to detect premium features
    final isPremium = plan.name.toLowerCase().contains('premium') ||
                      plan.name.toLowerCase().contains('pro') ||
                      plan.name.toLowerCase().contains('unlimited') ||
                      (plan.durationDays != null && plan.durationDays! > 15) ||
                      index % 2 == 1;

    // Alternate color mapping role assignments (swap primary and secondary roles)
    final isEven = index % 2 == 0;
    final mainColor = isEven ? AppColors.secondary : AppColors.primary;
    final accentColor = isEven ? AppColors.primary : AppColors.secondary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isPremium ? mainColor.withOpacity(0.5) : AppColors.border,
          width: isPremium ? 1.5 : 1.0,
        ),
        boxShadow: isPremium
            ? [
                BoxShadow(
                  color: mainColor.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isPremium) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'RECOMMENDED',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  color: accentColor,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(plan.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              Text(
                '${plan.currencyCode} ${priceMajor.toStringAsFixed(2)}',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: mainColor),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            plan.durationDays != null ? '${plan.durationDays} days' : 'Lifetime',
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
                      Expanded(child: Text(f, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary))),
                    ],
                  ),
                )),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_isProcessing || unsupportedGateway)
                  ? null
                  : () => _bloc.add(PurchasePlanRequested(planId: plan.id)),
              style: ElevatedButton.styleFrom(
                backgroundColor: mainColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: Text(unsupportedGateway ? 'Not available in the app yet' : 'Subscribe'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(String message, {VoidCallback? onRetry}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: onRetry,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
