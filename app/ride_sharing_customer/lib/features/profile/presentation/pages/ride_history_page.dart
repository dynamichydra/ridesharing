import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/profile_bloc.dart';

class RideHistoryPage extends StatefulWidget {
  const RideHistoryPage({super.key});

  @override
  State<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends State<RideHistoryPage> {
  @override
  void initState() {
    super.initState();
    context.read<ProfileBloc>().add(LoadRideHistoryEvent());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Ride History'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const LoadingView();
          }

          if (state is ProfileLoaded) {
            final rides = state.rideHistory;

            if (rides.isEmpty) {
              return const EmptyView(
                title: 'No Rides Booked',
                message: 'Your past rides will appear here.',
                icon: Icons.directions_car_rounded,
              );
            }

            return ListView.separated(
              itemCount: rides.length,
              padding: const EdgeInsets.all(AppSpacing.m),
              separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.s),
              itemBuilder: (context, index) {
                final ride = rides[index];
                final status = ride['status'] as String;
                final isCompleted = status == 'completed';
                final dateStr = ride['date'].toString().split('T')[0];

                // Ride Icons Mapping
                String vehicleIcon = '🚗';
                if (ride['vehicle_type'] == 'standard') vehicleIcon = '🚙';
                if (ride['vehicle_type'] == 'premium') vehicleIcon = '🚕';
                if (ride['vehicle_type'] == 'xl') vehicleIcon = '🚐';

                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.m, vertical: 8),
                    leading: Container(
                      padding: const EdgeInsets.all(AppSpacing.s),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey[850] : Colors.grey[100],
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        vehicleIcon,
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                    title: Text(
                      ride['destination_name'] as String,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 2),
                        Text(
                          'To: ${ride['destination_address']}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              dateStr,
                              style: TextStyle(color: Colors.grey[500], fontSize: 11),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isCompleted
                                    ? AppColors.successGreen.withOpacity(0.12)
                                    : theme.colorScheme.error.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                status.toUpperCase(),
                                style: TextStyle(
                                  color: isCompleted ? AppColors.successGreen : theme.colorScheme.error,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${AppConstants.currencySymbol}${(ride['fare'] as num).toDouble().toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.grey),
                      ],
                    ),
                    onTap: () {
                      context.push('/ride-detail', extra: ride);
                    },
                  ),
                );
              },
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
