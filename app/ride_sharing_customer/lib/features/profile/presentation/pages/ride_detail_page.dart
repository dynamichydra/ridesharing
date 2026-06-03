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

            // 2. Locations Panel Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.l),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Route details',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
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
                                ride['pickup_name'] as String,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                ride['pickup_address'] as String,
                                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                ride['destination_name'] as String,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                ride['destination_address'] as String,
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

            // 3. Driver Details Panel Card
            if (ride['driver_name'] != 'None') ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.l),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Driver details',
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
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
                                  ride['driver_name'] as String,
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                                    const SizedBox(width: 2),
                                    Text(
                                      '${ride['driver_rating']}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '• ${ride['vehicle_info']}',
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
                              ride['vehicle_plate'] as String,
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
          ],
        ),
      ),
    );
  }
}
