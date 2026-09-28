import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../common/widgets/app_drawer.dart';
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';

enum InboxFilter { all, rides, promotions, updates }

class InboxItem {
  final String id;
  final String title;
  final String message;
  final String time;
  final InboxFilter category;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String? route;
  bool isRead;

  InboxItem({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.category,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    this.route,
    this.isRead = false,
  });
}

class InboxPage extends StatefulWidget {
  const InboxPage({super.key});

  @override
  State<InboxPage> createState() => _InboxPageState();
}

class _InboxPageState extends State<InboxPage> {
  InboxFilter _selectedFilter = InboxFilter.all;

  final List<InboxItem> _notifications = [
    InboxItem(
      id: '1',
      title: 'Weekly Bonus',
      message: 'Complete 50 trips this week and earn an extra ₹1,000 bonus!',
      time: '2h ago',
      category: InboxFilter.promotions,
      icon: Icons.card_giftcard_rounded,
      iconColor: const Color(0xFFD97706),
      iconBg: const Color(0xFFFEF3C7),
      route: '/earnings',
    ),
    InboxItem(
      id: '2',
      title: 'Incentive Unlocked',
      message: 'You earned an extra ₹100 for peak hours completion!',
      time: '5h ago',
      category: InboxFilter.promotions,
      icon: Icons.military_tech_rounded,
      iconColor: const Color(0xFF009048),
      iconBg: const Color(0xFFDCFCE7),
      route: '/earnings',
    ),
    InboxItem(
      id: '3',
      title: 'App Update',
      message: 'A new version is available with improved GPS accuracy and stability.',
      time: '1d ago',
      category: InboxFilter.updates,
      icon: Icons.system_update_rounded,
      iconColor: const Color(0xFF0284C7),
      iconBg: const Color(0xFFE0F2FE),
    ),
    InboxItem(
      id: '4',
      title: 'Payment Received',
      message: '₹1,248 credited to your wallet from today\'s completed trips.',
      time: '1d ago',
      category: InboxFilter.rides,
      icon: Icons.account_balance_wallet_rounded,
      iconColor: const Color(0xFFEA580C),
      iconBg: const Color(0xFFFFEDD5),
      route: '/wallet',
    ),
    InboxItem(
      id: '5',
      title: 'Rider Feedback',
      message: 'Rahul gave you a 5★ rating: "Smooth ride, very professional!"',
      time: '1d ago',
      category: InboxFilter.rides,
      icon: Icons.star_rounded,
      iconColor: const Color(0xFF009048),
      iconBg: const Color(0xFFD1FAE5),
      route: '/profile',
    ),
    InboxItem(
      id: '6',
      title: 'Important Notice',
      message: 'Vehicle document verification pending. Please review your uploads.',
      time: '2d ago',
      category: InboxFilter.updates,
      icon: Icons.warning_amber_rounded,
      iconColor: const Color(0xFFDC2626),
      iconBg: const Color(0xFFFEE2E2),
      route: '/documents',
    ),
  ];

  List<InboxItem> get _filteredNotifications {
    if (_selectedFilter == InboxFilter.all) return _notifications;
    return _notifications.where((n) => n.category == _selectedFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredNotifications;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.menu_rounded,
            color: Color(0xFF0B1D35),
            size: 26,
          ),
          onPressed: () => DriverMainLayout.openDrawer(),
        ),
        title: const Text(
          'Inbox',
          style: TextStyle(
            color: Color(0xFF0B1D35),
            fontWeight: FontWeight.w800,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(
              Icons.done_all_rounded,
              color: Color(0xFF64748B),
              size: 22,
            ),
            tooltip: 'Mark all as read',
            onPressed: () {
              setState(() {
                for (final n in _notifications) {
                  n.isRead = true;
                }
              });
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filter Tabs (All, Rides, Promotions, Updates)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('All', InboxFilter.all),
                  const SizedBox(width: 8),
                  _buildFilterChip('Rides', InboxFilter.rides),
                  const SizedBox(width: 8),
                  _buildFilterChip('Promotions', InboxFilter.promotions),
                  const SizedBox(width: 8),
                  _buildFilterChip('Updates', InboxFilter.updates),
                ],
              ),
            ),
          ),

          const Divider(height: 1, color: Color(0xFFF1F5F9)),

          // List of notifications
          Expanded(
            child: RefreshIndicator(
              color: const Color(0xFF009048),
              onRefresh: () async {
                await Future.delayed(const Duration(milliseconds: 600));
              },
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: const BoxDecoration(
                              color: Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.notifications_none_rounded,
                              color: Color(0xFF94A3B8),
                              size: 32,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'No notifications',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'You\'re all caught up for this category',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = filtered[index];
                        return _buildNotificationCard(item);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, InboxFilter filter) {
    final isSelected = _selectedFilter == filter;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = filter;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF009048) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard(InboxItem item) {
    return InkWell(
      onTap: () {
        setState(() {
          item.isRead = true;
        });
        if (item.route != null) {
          context.push(item.route!);
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.isRead ? Colors.white : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: item.isRead ? const Color(0xFFF1F5F9) : const Color(0xFFE2E8F0),
            width: item.isRead ? 1 : 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Category Icon
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: item.iconBg,
                shape: BoxShape.circle,
              ),
              child: Icon(
                item.icon,
                color: item.iconColor,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: item.isRead ? FontWeight.w600 : FontWeight.w800,
                          color: const Color(0xFF0B1D35),
                        ),
                      ),
                      Text(
                        item.time,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.message,
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.35,
                      color: item.isRead ? const Color(0xFF64748B) : const Color(0xFF334155),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
