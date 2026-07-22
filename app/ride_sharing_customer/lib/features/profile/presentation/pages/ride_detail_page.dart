import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';

class RideDetailPage extends StatelessWidget {
  final Map<String, dynamic> ride;

  const RideDetailPage({super.key, required this.ride});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final status = ride['status'] as String;
    final isCompleted = status == 'completed';
    final fare = (ride['fare'] as num).toDouble();

    // Calculate billing breakdown (Taxes, Platform fees, base rate)
    final platformFee = double.parse((fare * 0.08).toStringAsFixed(2));
    final tax = double.parse((fare * 0.05).toStringAsFixed(2));
    const discount = 0.00;
    final baseFare = double.parse((fare - platformFee - tax).toStringAsFixed(2));

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Ride Receipt'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Status Panel Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.l),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Ride ${ride['id']}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? AppColors.successGreen.withOpacity(0.12)
                                : theme.colorScheme.error.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            status.toUpperCase(),
                            style: TextStyle(
                              color: isCompleted ? AppColors.successGreen : theme.colorScheme.error,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    const SizedBox(height: 8),
                    Text(
                      '${AppConstants.currencySymbol}${fare.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 32),
                    ),
                    Text(
                      ride['date'].toString().split('T')[0],
                      style: TextStyle(color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.l),

            // 2. Fare Breakdown Panel
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.l),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Fare Breakdown',
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: AppSpacing.m),
                    _buildFareRow(context, 'Base Fare', baseFare),
                    _buildFareRow(context, 'Platform Fee', platformFee),
                    _buildFareRow(context, 'Taxes (5% GST/HST)', tax),
                    if (discount > 0)
                      _buildFareRow(context, 'Promo Discount', -discount, isDiscount: true),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total Paid',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Text(
                          '${AppConstants.currencySymbol}${fare.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900, 
                            fontSize: 18, 
                            color: AppColors.primaryBlue
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.l),

            // 3. Locations Panel Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.l),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Route details',
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: AppSpacing.m),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Column(
                          children: [
                            const Icon(Icons.radio_button_checked_rounded, color: AppColors.primaryBlue, size: 18),
                            Container(width: 2, height: 36, color: Colors.grey[300]),
                            const Icon(Icons.location_on_rounded, color: AppColors.errorRed, size: 18),
                          ],
                        ),
                        const SizedBox(width: AppSpacing.m),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ride['pickup_name'] as String? ?? 'Pickup Location',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                ride['pickup_address'] as String? ?? '',
                                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                ride['destination_name'] as String? ?? 'Destination Location',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                ride['destination_address'] as String? ?? '',
                                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                              ),
                            ],
                          ),
                        )
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.l),

            // 4. Driver Details Panel Card
            if (ride['driver'] != null || ride['driver_name'] != 'None') ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.l),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Driver details',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: AppSpacing.m),
                      Row(
                        children: [
                          const CircleAvatar(
                            radius: 24,
                            backgroundImage: NetworkImage(
                              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
                            ),
                          ),
                          const SizedBox(width: AppSpacing.m),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ride['driver'] != null 
                                      ? (ride['driver']['name'] ?? 'Driver') 
                                      : (ride['driver_name'] ?? 'Driver'),
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                                    const SizedBox(width: 2),
                                    Text(
                                      '${ride['driver'] != null ? (ride['driver']['rating'] ?? 5.0) : (ride['driver_rating'] ?? 5.0)}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '• ${ride['driver'] != null ? (ride['driver']['vehicle'] ?? 'Car') : (ride['vehicle_info'] ?? 'Car')}',
                                      style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey[850] : Colors.grey[100],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              ride['vehicle_plate'] as String? ?? 'WB12EF3003',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),

            // 5. Download and Share Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: isDark ? Colors.grey[700]! : Colors.grey[300]!),
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.m),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.m)),
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Invoice ${ride['id']}.pdf downloaded to Downloads directory.'),
                          backgroundColor: AppColors.successGreen,
                        ),
                      );
                    },
                    icon: const Icon(Icons.download_rounded, color: AppColors.primaryBlue),
                    label: const Text('Download Invoice'),
                  ),
                ),
                const SizedBox(width: AppSpacing.m),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.m),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.m)),
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Invoice link copied to clipboard. Ready to share!'),
                          backgroundColor: AppColors.secondaryBlue,
                        ),
                      );
                    },
                    icon: const Icon(Icons.share_rounded),
                    label: const Text('Share Invoice'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }

  Widget _buildFareRow(BuildContext context, String label, double amount, {bool isDiscount = false}) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              fontSize: 14
            ),
          ),
          Text(
            isDiscount
                ? '-${AppConstants.currencySymbol}${amount.abs().toStringAsFixed(2)}'
                : '${AppConstants.currencySymbol}${amount.toStringAsFixed(2)}',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: isDiscount ? AppColors.successGreen : (isDark ? Colors.white : Colors.black),
              fontSize: 14
            ),
          ),
        ],
      ),
    );
  }
}
