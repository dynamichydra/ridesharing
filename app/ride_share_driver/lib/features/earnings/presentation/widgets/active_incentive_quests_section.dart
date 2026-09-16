import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/earnings_remote_datasource.dart';
import '../../data/models/driver_incentive_model.dart';

class ActiveIncentiveQuestsSection extends StatefulWidget {
  const ActiveIncentiveQuestsSection({super.key});

  @override
  State<ActiveIncentiveQuestsSection> createState() => _ActiveIncentiveQuestsSectionState();
}

class _ActiveIncentiveQuestsSectionState extends State<ActiveIncentiveQuestsSection> {
  final EarningsRemoteDataSource _dataSource = sl<EarningsRemoteDataSource>();
  bool _isLoading = true;
  DriverIncentiveProgressSummary? _summary;
  String? _claimingRuleId;

  @override
  void initState() {
    super.initState();
    _loadIncentives();
  }

  Future<void> _loadIncentives() async {
    try {
      final json = await _dataSource.getIncentiveProgress();
      setState(() {
        _summary = DriverIncentiveProgressSummary.fromJson(json);
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _claimReward(DriverIncentiveQuest quest) async {
    setState(() {
      _claimingRuleId = quest.ruleId;
    });

    try {
      await _dataSource.claimIncentive(quest.campaignId, quest.ruleId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bonus reward claimed! ${_formatCurrency(quest.rewardAmountMinor, quest.currencyCode)} added to your wallet.'),
            backgroundColor: const Color(0xFF009048),
          ),
        );
      }
      await _loadIncentives();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to claim reward: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _claimingRuleId = null;
        });
      }
    }
  }

  String _formatCurrency(int amountMinor, String code) {
    final symbol = code.toUpperCase() == 'INR' ? '₹' : '\$';
    return '$symbol${(amountMinor / 100).toStringAsFixed(2)}';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox.shrink();
    }

    final quests = _summary?.activeQuests ?? [];
    if (quests.isEmpty) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Row(
          children: [
            Icon(Icons.stars_rounded, color: Color(0xFF009048), size: 32),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Incentives & Quests', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                  SizedBox(height: 2),
                  Text('Complete trip goals to unlock extra cash bonuses and platform rewards.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF009048).withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF009048).withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.workspace_premium_rounded, color: Color(0xFF009048), size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Active Bonus Quests',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              if (_summary != null && _summary!.totalRewardsEarnedMinor > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F4EA),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Total Earned: ${_formatCurrency(_summary!.totalRewardsEarnedMinor, "INR")}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF009048)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          ...quests.map((q) => _buildQuestCard(q)),
        ],
      ),
    );
  }

  Widget _buildQuestCard(DriverIncentiveQuest quest) {
    final isAchieved = quest.status == 'achieved' || quest.percentComplete >= 100;
    final isClaiming = _claimingRuleId == quest.ruleId;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isAchieved ? const Color(0xFF009048) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  quest.campaignName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                ),
              ),
              Text(
                '+${_formatCurrency(quest.rewardAmountMinor, quest.currencyCode)}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF009048)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${quest.currentTrips} of ${quest.targetTrips} rides completed',
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              Text(
                '${quest.percentComplete}%',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: quest.percentComplete / 100,
              minHeight: 6,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: AlwaysStoppedAnimation<Color>(
                isAchieved ? const Color(0xFF009048) : const Color(0xFF3B82F6),
              ),
            ),
          ),
          if (isAchieved) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isClaiming ? null : () => _claimReward(quest),
                icon: isClaiming
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.card_giftcard_rounded, size: 16),
                label: Text(isClaiming ? 'Claiming...' : 'Claim Bonus Reward'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF009048),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
