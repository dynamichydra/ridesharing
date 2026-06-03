import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../bloc/notifications_bloc.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  @override
  void initState() {
    super.initState();
    context.read<NotificationsBloc>().add(LoadNotifications());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<NotificationsBloc, NotificationsState>(
        builder: (context, state) {
          if (state is NotificationsLoading) {
            return const LoadingView(isList: true);
          }

          if (state is NotificationsError) {
            return ErrorView(
              message: state.message,
              onRetry: () => context.read<NotificationsBloc>().add(LoadNotifications()),
            );
          }

          if (state is NotificationsLoaded) {
            final list = state.notifications;

            if (list.isEmpty) {
              return const EmptyView(
                title: 'All caught up!',
                message: 'You have no new notifications.',
                icon: Icons.notifications_off_outlined,
              );
            }

            return ListView.separated(
              itemCount: list.length,
              padding: const EdgeInsets.all(AppSpacing.m),
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final notif = list[index];
                final isRead = notif['is_read'] as bool? ?? false;
                final dateStr = notif['timestamp'].toString().split('T')[0];

                IconData icon = Icons.notifications_none_rounded;
                if (notif['type'] == 'receipt') icon = Icons.receipt_outlined;
                if (notif['type'] == 'security') icon = Icons.security_rounded;

                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Stack(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.s),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey[850] : Colors.grey[100],
                          shape: BoxShape.circle,
                        ),
                        child: Icon(icon, color: AppColors.primaryBlue),
                      ),
                      if (!isRead)
                        Positioned(
                          right: 0,
                          top: 0,
                          child: Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(
                              color: AppColors.errorRed,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                  title: Text(
                    notif['title'] as String,
                    style: TextStyle(
                      fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(
                        notif['message'] as String,
                        style: theme.textTheme.bodyMedium?.copyWith(height: 1.3),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        dateStr,
                        style: TextStyle(color: Colors.grey[500], fontSize: 11),
                      ),
                    ],
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.close_rounded, size: 18),
                    onPressed: () {
                      context.read<NotificationsBloc>().add(DeleteNotificationEvent(notif['id'] as String));
                    },
                  ),
                  onTap: () {
                    if (!isRead) {
                      context.read<NotificationsBloc>().add(MarkNotificationAsRead(notif['id'] as String));
                    }
                  },
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
