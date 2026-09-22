enum EarningsPeriod { daily, weekly, monthly }

class EarningsDataModel {
  final String totalEarnings;
  final String growthPercent;
  final String growthPeriod;
  final String cashCollected;
  final String incentivesAmount;
  final int trips;
  final String onlineHours;
  final String avgPerTrip;
  final double cashPercent;
  final double walletPercent;
  final String fareAmount;
  final String incentives;
  final String otherEarnings;
  final String grossEarnings;
  final String deductions;
  final String netEarnings;
  final String listTitle;
  final String currencyCode;
  final List<DayEarningItem> historyItems;

  const EarningsDataModel({
    required this.totalEarnings,
    required this.growthPercent,
    required this.growthPeriod,
    required this.cashCollected,
    required this.incentivesAmount,
    required this.trips,
    required this.onlineHours,
    required this.avgPerTrip,
    required this.cashPercent,
    required this.walletPercent,
    required this.fareAmount,
    required this.incentives,
    required this.otherEarnings,
    required this.grossEarnings,
    required this.deductions,
    required this.netEarnings,
    required this.listTitle,
    this.currencyCode = 'CAD',
    required this.historyItems,
  });

  factory EarningsDataModel.empty({
    EarningsPeriod period = EarningsPeriod.daily,
    String? listTitle,
    String currencyCode = 'CAD',
  }) {
    final defaultTitle = period == EarningsPeriod.daily
        ? 'Today'
        : period == EarningsPeriod.weekly
            ? 'Last 7 Days'
            : 'Last 30 Days';
    final sym = currencyCode.toUpperCase() == 'INR' ? '₹' : '\$';
    return EarningsDataModel(
      totalEarnings: '${sym}0.00',
      growthPercent: '0.0%',
      growthPeriod: period == EarningsPeriod.daily
          ? 'vs Yesterday'
          : period == EarningsPeriod.weekly
              ? 'vs Prior 7 Days'
              : 'vs Prior 30 Days',
      cashCollected: '${sym}0.00',
      incentivesAmount: '${sym}0.00',
      trips: 0,
      onlineHours: '0m',
      avgPerTrip: '${sym}0.00',
      cashPercent: 50.0,
      walletPercent: 50.0,
      fareAmount: '${sym}0.00',
      incentives: '${sym}0.00',
      otherEarnings: '${sym}0.00',
      grossEarnings: '${sym}0.00',
      deductions: '${sym}0.00',
      netEarnings: '${sym}0.00',
      listTitle: listTitle ?? defaultTitle,
      currencyCode: currencyCode,
      historyItems: const [],
    );
  }
}

class DayEarningItem {
  final String title;
  final String? dateSubtitle;
  final bool isToday;
  final int trips;
  final String amount;

  const DayEarningItem({
    required this.title,
    this.dateSubtitle,
    this.isToday = false,
    required this.trips,
    required this.amount,
  });
}
