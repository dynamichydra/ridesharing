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
    required this.historyItems,
  });

  factory EarningsDataModel.empty({
    EarningsPeriod period = EarningsPeriod.daily,
    String listTitle = 'Last 7 Days',
  }) {
    return EarningsDataModel(
      totalEarnings: '₹0.00',
      growthPercent: '0.0%',
      growthPeriod: period == EarningsPeriod.daily
          ? 'vs Yesterday'
          : period == EarningsPeriod.weekly
              ? 'vs Last Week'
              : 'vs Last Month',
      cashCollected: '₹0.00',
      incentivesAmount: '₹0.00',
      trips: 0,
      onlineHours: '0m',
      avgPerTrip: '₹0.00',
      cashPercent: 50.0,
      walletPercent: 50.0,
      fareAmount: '₹0.00',
      incentives: '₹0.00',
      otherEarnings: '₹0.00',
      grossEarnings: '₹0.00',
      deductions: '₹0.00',
      netEarnings: '₹0.00',
      listTitle: listTitle,
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
