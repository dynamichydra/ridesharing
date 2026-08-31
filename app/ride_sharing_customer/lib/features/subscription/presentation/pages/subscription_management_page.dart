import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../injection_container.dart';
import '../../domain/entities/rider_subscription_entities.dart';
import '../bloc/subscription_bloc.dart';

class SubscriptionManagementPage extends StatelessWidget {
  const SubscriptionManagementPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<SubscriptionBloc>(
      create: (context) => sl<SubscriptionBloc>()..add(const LoadSubscriptionOverview()),
      child: const _SubscriptionManagementView(),
    );
  }
}

class _SubscriptionManagementView extends StatelessWidget {
  const _SubscriptionManagementView();

  void _onSubscribePressed(BuildContext context, String planId) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (modalCtx) => _buildConfirmationSheet(context, modalCtx, planId),
    );
  }

  Widget _buildConfirmationSheet(BuildContext parentContext, BuildContext modalCtx, String planId) {
    final theme = Theme.of(parentContext);
    final isDark = theme.brightness == Brightness.dark;
    final bloc = parentContext.read<SubscriptionBloc>();

    return BlocBuilder<SubscriptionBloc, SubscriptionState>(
      bloc: bloc,
      builder: (context, state) {
        RiderSubscriptionPlan? plan;
        if (state is SubscriptionOverviewLoaded) {
          plan = state.availablePlans.firstWhere(
            (p) => p.id == planId,
            orElse: () => state.availablePlans.first,
          );
        }

        if (plan == null) return const SizedBox.shrink();

        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlue.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.star_rounded, color: AppColors.primaryBlue, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Confirm Membership',
                          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Select ${plan.name}',
                          style: TextStyle(
                            color: isDark ? Colors.white70 : const Color(0xFF64748B),
                            fontSize: 13,
                          ),
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
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.withOpacity(0.15)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Duration', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                        Text(plan.durationLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Price', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                        Text(
                          plan.formattedPrice,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.pop(modalCtx);
                    bloc.add(PurchasePlanRequested(planId: planId));
                  },
                  child: const Text(
                    'Proceed to Activate',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF0B1120) : Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              context.go('/profile');
            }
          },
        ),
        title: const Text(
          'Membership & Subscription',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: BlocConsumer<SubscriptionBloc, SubscriptionState>(
        listener: (context, state) {
          if (state is PurchaseSuccess) {
            CustomToast.show(context, state.message);
            context.read<SubscriptionBloc>().add(const LoadSubscriptionOverview());
          } else if (state is SubscriptionError) {
            CustomToast.show(context, state.message);
          }
        },
          builder: (context, state) {
            if (state is SubscriptionOverviewLoading || state is PurchaseProcessing) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: AppColors.primaryBlue),
                    const SizedBox(height: 16),
                    Text(
                      state is PurchaseProcessing
                          ? 'Activating your membership...'
                          : 'Loading subscription details...',
                      style: TextStyle(color: isDark ? Colors.white70 : const Color(0xFF64748B)),
                    ),
                  ],
                ),
              );
            }

            if (state is SubscriptionOverviewLoaded) {
              return RefreshIndicator(
                onRefresh: () async {
                  context.read<SubscriptionBloc>().add(const LoadSubscriptionOverview());
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(AppSpacing.m),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Current Membership Status Hero Card
                      _buildCurrentPlanHero(state.activeSubscription, isDark),
                      const SizedBox(height: 24),

                      // 2. Plan Tier Options (Upgrade / Select)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            state.activeSubscription != null && state.activeSubscription!.isActive
                                ? 'Available Upgrades'
                                : 'Choose Membership Plan',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              fontSize: 17,
                            ),
                          ),
                          if (state.availablePlans.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primaryBlue.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${state.availablePlans.length} Plans',
                                style: const TextStyle(
                                  color: AppColors.primaryBlue,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      if (state.availablePlans.isEmpty)
                        _buildEmptyPlansCard(isDark)
                      else
                        ...state.availablePlans.map(
                          (plan) => _buildPlanCard(
                            context,
                            plan,
                            isActivePlan: state.activeSubscription?.planId == plan.id &&
                                state.activeSubscription?.isActive == true,
                            isDark: isDark,
                          ),
                        ),

                      const SizedBox(height: 24),

                      // 3. Subscriber Benefits Feature Highlight
                      _buildBenefitsGrid(isDark),

                      const SizedBox(height: 24),

                      // 4. Subscription History (if any)
                      if (state.history.isNotEmpty) ...[
                        Text(
                          'Billing & Renewal History',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                          ),
                        ),
                        const SizedBox(height: 14),
                        _buildHistoryList(state.history, isDark),
                        const SizedBox(height: 24),
                      ],
                    ],
                  ),
                ),
              );
            }

            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 48, color: Colors.orange),
                    const SizedBox(height: 16),
                    const Text(
                      'Failed to load subscription details',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryBlue,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () => context.read<SubscriptionBloc>().add(const LoadSubscriptionOverview()),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
  }

  // ── HERO CARD: CURRENT STATUS (ACTIVE, EXPIRED, OR NONE) ───────────────────────
  Widget _buildCurrentPlanHero(ActiveRiderSubscription? sub, bool isDark) {
    final bool hasActive = sub != null && sub.isActive;
    final bool isExpired = sub != null && sub.isExpired;

    if (hasActive) {
      final days = sub.daysRemaining;
      final endDateStr = sub.endDate != null
          ? '${sub.endDate!.day}/${sub.endDate!.month}/${sub.endDate!.year}'
          : 'Lifetime';

      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E3A8A).withOpacity(0.3),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF10B981), width: 1.2),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 14),
                      SizedBox(width: 6),
                      Text(
                        'ACTIVE MEMBER',
                        style: TextStyle(
                          color: Color(0xFF10B981),
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.workspace_premium_rounded, color: Color(0xFFFBBF24), size: 30),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              sub.plan?.name ?? 'Premium Membership',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 22,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              days != null ? '$days days remaining (Renews $endDateStr)' : 'Unlimited Lifetime Access',
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 16),
            const Divider(color: Colors.white12, height: 1),
            const SizedBox(height: 14),
            Row(
              children: [
                _buildHeroStat('Surge Cap', '0% Extra'),
                const SizedBox(width: 24),
                _buildHeroStat('Ride Discount', 'Active'),
                const SizedBox(width: 24),
                _buildHeroStat('Priority Dispatch', 'VIP'),
              ],
            ),
          ],
        ),
      );
    } else if (isExpired) {
      // EXPIRED STATUS STATE
      final expiryDate = sub.endDate != null
          ? '${sub.endDate!.day}/${sub.endDate!.month}/${sub.endDate!.year}'
          : 'recently';

      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF7F1D1D), Color(0xFF991B1B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.red.withOpacity(0.2),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.white, size: 14),
                      SizedBox(width: 6),
                      Text(
                        'PLAN EXPIRED',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.timer_off_outlined, color: Colors.white70, size: 28),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '${sub.plan?.name ?? "Membership"} Expired',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Your benefits expired on $expiryDate. Renew below to continue saving on every ride.',
              style: const TextStyle(
                color: Color(0xFFFECACA),
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    } else {
      // NO ACTIVE SUBSCRIPTION STATE
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1E293B), Color(0xFF334155)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white12,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'NO ACTIVE PLAN',
                    style: TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const Icon(Icons.card_membership_rounded, color: Colors.white60, size: 26),
              ],
            ),
            const SizedBox(height: 14),
            const Text(
              'Unlock Exclusive Ride Savings',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 19,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Save up to 20% on all trips, skip surge pricing, and enjoy priority driver matching.',
              style: TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildHeroStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  // ── PLAN TIER CARD ──────────────────────────────────────────────────────────
  Widget _buildPlanCard(
    BuildContext context,
    RiderSubscriptionPlan plan, {
    required bool isActivePlan,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isActivePlan ? const Color(0xFF10B981) : Colors.grey.withOpacity(0.18),
          width: isActivePlan ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.name,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    plan.durationLabel,
                    style: TextStyle(
                      color: isDark ? Colors.white60 : const Color(0xFF64748B),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    plan.formattedPrice,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                      color: AppColors.primaryBlue,
                    ),
                  ),
                  Text(
                    plan.durationDays != null ? '/ ${plan.durationDays}d' : '/ one-time',
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (plan.features.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 12),
            ...plan.features.map(
              (feat) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: AppColors.primaryBlue, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        feat,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.white70 : const Color(0xFF334155),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: isActivePlan
                    ? const Color(0xFF10B981)
                    : AppColors.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: isActivePlan ? null : () => _onSubscribePressed(context, plan.id),
              child: Text(
                isActivePlan ? 'Current Active Plan' : 'Select & Upgrade',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyPlansCard(bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Center(
        child: Text(
          'No subscription plans available currently in your region.',
          style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  // ── SUBSCRIBER BENEFITS GRID ─────────────────────────────────────────────────
  Widget _buildBenefitsGrid(bool isDark) {
    final benefits = [
      {'icon': Icons.bolt_rounded, 'title': 'No Surge Multiplier', 'desc': 'Fixed transparent fares even during peak commute hours.'},
      {'icon': Icons.discount_outlined, 'title': '10-20% Ride Savings', 'desc': 'Automatic discount applied directly at checkout.'},
      {'icon': Icons.radar_rounded, 'title': 'Priority Driver Queue', 'desc': 'Fastest matching with top-rated 5-star drivers nearby.'},
      {'icon': Icons.headset_mic_outlined, 'title': 'Dedicated Support', 'desc': '24/7 VIP in-app chat response within 2 minutes.'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Membership Perks',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: benefits.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.2,
          ),
          itemBuilder: (context, idx) {
            final item = benefits[idx];
            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.withOpacity(0.15)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(item['icon'] as IconData, color: AppColors.primaryBlue, size: 24),
                  const SizedBox(height: 8),
                  Text(
                    item['title'] as String,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item['desc'] as String,
                    style: TextStyle(
                      color: isDark ? Colors.white60 : const Color(0xFF64748B),
                      fontSize: 11,
                      height: 1.2,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  // ── HISTORY LIST ─────────────────────────────────────────────────────────────
  Widget _buildHistoryList(List<SubscriptionHistoryItem> history, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withOpacity(0.15)),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: history.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, idx) {
          final item = history[idx];
          final sub = item.subscription;
          final date = sub.startDate != null
              ? '${sub.startDate!.day}/${sub.startDate!.month}/${sub.startDate!.year}'
              : 'Recent';

          return ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (sub.isActive ? const Color(0xFF10B981) : Colors.grey).withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                sub.isActive ? Icons.check_circle_outline : Icons.history_rounded,
                color: sub.isActive ? const Color(0xFF10B981) : Colors.grey,
                size: 20,
              ),
            ),
            title: Text(
              item.plan?.name ?? 'Membership Plan',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            subtitle: Text(
              'Activated on $date • ${sub.status.toUpperCase()}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
            ),
            trailing: Text(
              sub.amountMinor != null
                  ? '\$${(sub.amountMinor! / 100.0).toStringAsFixed(2)}'
                  : 'Paid',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          );
        },
      ),
    );
  }
}
