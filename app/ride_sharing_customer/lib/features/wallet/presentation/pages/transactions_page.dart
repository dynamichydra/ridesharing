import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/wallet_bloc.dart';

class TransactionsPage extends StatefulWidget {
  const TransactionsPage({super.key});

  @override
  State<TransactionsPage> createState() => _TransactionsPageState();
}

class _TransactionsPageState extends State<TransactionsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedFilterType = 'All';
  DateTimeRange? _selectedDateRange;

  final List<Map<String, dynamic>> _may2024Transactions = [
    {
      'title': 'Ride Payment',
      'date': '14 May, 10:30 AM',
      'amount': 125,
      'isAdd': false,
      'month': 'May 2024',
    },
    {
      'title': 'Added Money',
      'date': '14 May, 06:20 PM',
      'amount': 200,
      'isAdd': true,
      'month': 'May 2024',
    },
    {
      'title': 'Ride Payment',
      'date': '14 May, 11:10 AM',
      'amount': 80,
      'isAdd': false,
      'month': 'May 2024',
    },
    {
      'title': 'Added Money',
      'date': '12 May, 09:15 PM',
      'amount': 300,
      'isAdd': true,
      'month': 'May 2024',
    },
  ];

  final List<Map<String, dynamic>> _april2024Transactions = [
    {
      'title': 'Ride Payment',
      'date': '29 Apr, 08:45 AM',
      'amount': 150,
      'isAdd': false,
      'month': 'April 2024',
    },
    {
      'title': 'Added Money',
      'date': '28 Apr, 07:30 PM',
      'amount': 200,
      'isAdd': true,
      'month': 'April 2024',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showFilterModal(BuildContext context) {
    String tempType = _selectedFilterType;
    DateTimeRange? tempRange = _selectedDateRange;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 20,
                    offset: Offset(0, -4),
                  ),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header with title & close button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Filter Transactions',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0A2540),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close_rounded,
                              color: Color(0xFF64748B), size: 18),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Type Section
                  const Text(
                    'Transaction Type',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      _buildFilterTypeOption('All', tempType, (val) {
                        setModalState(() => tempType = val);
                      }),
                      const SizedBox(width: 8),
                      _buildFilterTypeOption('Money In', tempType, (val) {
                        setModalState(() => tempType = val);
                      }),
                      const SizedBox(width: 8),
                      _buildFilterTypeOption('Money Out', tempType, (val) {
                        setModalState(() => tempType = val);
                      }),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Date Range Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Date Range',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      if (tempRange != null)
                        GestureDetector(
                          onTap: () {
                            setModalState(() => tempRange = null);
                          },
                          child: const Text(
                            'Clear Date',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFE53935),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  GestureDetector(
                    onTap: () async {
                      final picked = await showDateRangePicker(
                        context: context,
                        firstDate: DateTime(2023),
                        lastDate: DateTime.now(),
                        initialDateRange: tempRange,
                        builder: (context, child) {
                          return Theme(
                            data: Theme.of(context).copyWith(
                              colorScheme: const ColorScheme.light(
                                primary: Color(0xFF009048),
                                onPrimary: Colors.white,
                              ),
                            ),
                            child: child!,
                          );
                        },
                      );
                      if (picked != null) {
                        setModalState(() => tempRange = picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: tempRange == null
                            ? const Color(0xFFF8FAFC)
                            : const Color(0xFFE6F4EA),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: tempRange == null
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFF009048),
                          width: tempRange == null ? 1 : 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.calendar_month_rounded,
                            color: tempRange == null
                                ? const Color(0xFF64748B)
                                : const Color(0xFF009048),
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              tempRange == null
                                  ? 'Select Date Range'
                                  : '${tempRange!.start.day}/${tempRange!.start.month}/${tempRange!.start.year} - ${tempRange!.end.day}/${tempRange!.end.month}/${tempRange!.end.year}',
                              style: TextStyle(
                                fontSize: 14,
                                color: tempRange == null
                                    ? const Color(0xFF64748B)
                                    : const Color(0xFF0A2540),
                                fontWeight: tempRange == null
                                    ? FontWeight.normal
                                    : FontWeight.bold,
                              ),
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded,
                              color: Color(0xFF94A3B8), size: 22),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Apply Filter Button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _selectedFilterType = tempType;
                          _selectedDateRange = tempRange;
                          if (tempType == 'All') {
                            _tabController.animateTo(0);
                          } else if (tempType == 'Money In') {
                            _tabController.animateTo(1);
                          } else if (tempType == 'Money Out') {
                            _tabController.animateTo(2);
                          }
                        });
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Apply Filter',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Clear Filters Button
                  Center(
                    child: TextButton(
                      onPressed: () {
                        setState(() {
                          _selectedFilterType = 'All';
                          _selectedDateRange = null;
                          _tabController.animateTo(0);
                        });
                        Navigator.pop(context);
                      },
                      child: const Text(
                        'Clear Filters',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0065B3),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildFilterTypeOption(
      String label, String currentType, Function(String) onSelect) {
    final bool isSelected = currentType == label;
    return Expanded(
      child: GestureDetector(
        onTap: () => onSelect(label),
        child: Container(
          height: 40,
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF009048) : const Color(0xFFFAFAFD),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF0A2540),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0A2540), size: 24),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Transactions',
          style: TextStyle(
            color: Color(0xFF0A2540),
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_alt_outlined, color: Color(0xFF0A2540), size: 24),
            onPressed: () => _showFilterModal(context),
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: TabBar(
            controller: _tabController,
            dividerColor: Colors.transparent,
            dividerHeight: 0,
            indicatorColor: const Color(0xFF009048),
            indicatorWeight: 3,
            indicatorSize: TabBarIndicatorSize.tab,
            indicatorPadding: const EdgeInsets.symmetric(horizontal: 24),
            labelColor: const Color(0xFF009048),
            unselectedLabelColor: const Color(0xFF64748B),
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            unselectedLabelStyle:
                const TextStyle(fontWeight: FontWeight.w500, fontSize: 15),
            tabs: const [
              Tab(text: 'All'),
              Tab(text: 'Money In'),
              Tab(text: 'Money Out'),
            ],
          ),
        ),
      ),
      body: BlocBuilder<WalletBloc, WalletState>(
        builder: (context, state) {
          return TabBarView(
            controller: _tabController,
            children: [
              // 1. All Transactions Tab
              _buildTransactionGroupList(
                mayList: _may2024Transactions,
                aprilList: _april2024Transactions,
              ),

              // 2. Money In Tab
              _buildTransactionGroupList(
                mayList: _may2024Transactions.where((t) => t['isAdd'] == true).toList(),
                aprilList: _april2024Transactions.where((t) => t['isAdd'] == true).toList(),
              ),

              // 3. Money Out Tab
              _buildTransactionGroupList(
                mayList: _may2024Transactions.where((t) => t['isAdd'] == false).toList(),
                aprilList: _april2024Transactions.where((t) => t['isAdd'] == false).toList(),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTransactionGroupList({
    required List<Map<String, dynamic>> mayList,
    required List<Map<String, dynamic>> aprilList,
  }) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (mayList.isNotEmpty) ...[
            const Text(
              'May 2024',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0A2540),
              ),
            ),
            const SizedBox(height: 12),
            ...mayList.map((tx) => _buildTransactionCard(tx)),
            const SizedBox(height: 20),
          ],
          if (aprilList.isNotEmpty) ...[
            const Text(
              'April 2024',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0A2540),
              ),
            ),
            const SizedBox(height: 12),
            ...aprilList.map((tx) => _buildTransactionCard(tx)),
            const SizedBox(height: 20),
          ],
        ],
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> tx) {
    final isAdd = tx['isAdd'] as bool;
    final assetPath = isAdd ? 'assets/icons/money-in.png' : 'assets/icons/cab-payment.png';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isAdd ? const Color(0xFFE6F4EA) : const Color(0xFFF1F5F9),
            ),
            child: Image.asset(
              assetPath,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Icon(
                isAdd ? Icons.add_card_rounded : Icons.directions_car_filled_rounded,
                color: isAdd ? const Color(0xFF009048) : const Color(0xFF0A2540),
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx['title'] as String,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0A2540),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  tx['date'] as String,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${isAdd ? '+' : '-'} ₹${tx['amount']}',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isAdd ? const Color(0xFF009048) : const Color(0xFF0A2540),
            ),
          ),
        ],
      ),
    );
  }
}
