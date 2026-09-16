class DriverIncentiveQuest {
  final String campaignId;
  final String campaignName;
  final String? campaignType;
  final String ruleId;
  final int targetTrips;
  final int currentTrips;
  final int tripsRemaining;
  final int rewardAmountMinor;
  final String currencyCode;
  final int percentComplete;
  final String status;
  final String? endAt;

  DriverIncentiveQuest({
    required this.campaignId,
    required this.campaignName,
    this.campaignType,
    required this.ruleId,
    required this.targetTrips,
    required this.currentTrips,
    required this.tripsRemaining,
    required this.rewardAmountMinor,
    required this.currencyCode,
    required this.percentComplete,
    required this.status,
    this.endAt,
  });

  factory DriverIncentiveQuest.fromJson(Map<String, dynamic> json) {
    return DriverIncentiveQuest(
      campaignId: json['campaignId']?.toString() ?? '',
      campaignName: json['campaignName']?.toString() ?? 'Bonus Quest',
      campaignType: json['campaignType']?.toString(),
      ruleId: json['ruleId']?.toString() ?? '',
      targetTrips: (json['targetTrips'] as num?)?.toInt() ?? 1,
      currentTrips: (json['currentTrips'] as num?)?.toInt() ?? 0,
      tripsRemaining: (json['tripsRemaining'] as num?)?.toInt() ?? 0,
      rewardAmountMinor: (json['rewardAmountMinor'] as num?)?.toInt() ?? 0,
      currencyCode: json['currencyCode']?.toString() ?? 'INR',
      percentComplete: (json['percentComplete'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'in_progress',
      endAt: json['endAt']?.toString(),
    );
  }
}

class DriverIncentiveProgressSummary {
  final List<DriverIncentiveQuest> activeQuests;
  final int totalRewardsEarnedMinor;

  DriverIncentiveProgressSummary({
    required this.activeQuests,
    required this.totalRewardsEarnedMinor,
  });

  factory DriverIncentiveProgressSummary.fromJson(Map<String, dynamic> json) {
    final rawQuests = json['activeQuests'] as List? ?? [];
    return DriverIncentiveProgressSummary(
      activeQuests: rawQuests
          .map((q) => DriverIncentiveQuest.fromJson(Map<String, dynamic>.from(q as Map)))
          .toList(),
      totalRewardsEarnedMinor: (json['totalRewardsEarnedMinor'] as num?)?.toInt() ?? 0,
    );
  }
}
