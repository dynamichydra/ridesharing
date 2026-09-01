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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    context.read<WalletBloc>().add(LoadWalletDetails());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _monthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[(month - 1).clamp(0, 11)];
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }

  List<Map<String, dynamic>> _parseTransactions(List<Map<String, dynamic>> raw) {
    return raw.map((t) {
      final amount = (t['amount'] as num?)?.toDouble() ?? 0.0;
      final type = t['type']?.toString().toLowerCase() ?? '';
      final isAdd = t['isAdd'] == true ||
          type == 'credit' ||
          type.contains('topup') ||
          type.contains('add') ||
          type.contains('bonus');
      final desc = isAdd ? 'Top Up' : 'Ride Payment';
      final dateStr = t['date']?.toString() ?? '';
      DateTime? dt = DateTime.tryParse(dateStr);
      final monthGroup = dt != null
          ? '${_monthName(dt.month)} ${dt.year}'
          : 'Recent';
      final formattedDate = dt != null
          ? '${dt.day} ${_monthName(dt.month).substring(0, 3)}, ${_formatTime(dt)}'
          : (dateStr.isNotEmpty ? dateStr : 'Recent');

      return {
        'id': t['id']?.toString() ?? '',
        'title': desc,
        'date': formattedDate,
        'amount': amount.toStringAsFixed(amount.truncateToDouble() == amount ? 0 : 2),
        'isAdd': isAdd,
        'month': monthGroup,
        'rawDate': dt ?? DateTime.now(),
      };
    }).toList();
  }

  Map<String, List<Map<String, dynamic>>> _groupByMonth(List<Map<String, dynamic>> txs) {
    final Map<String, List<Map<String, dynamic>>> groups = {};
    for (final tx in txs) {
      final month = tx['month'] as String;
      groups.putIfAbsent(month, () => []).add(tx);
    }
    return groups;
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

                  const Text(
                    'Transaction Type',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0A2540),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: ['All', 'Money In', 'Money Out'].map((type) {
                      final isSelected = tempType == type;
                      return ChoiceChip(
                        label: Text(type),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            setModalState(() => tempType = type);
                          }
                        },
                        selectedColor: const Color(0xFF009048),
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : const Color(0xFF0A2540),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          fontSize: 13,
                        ),
                        backgroundColor: const Color(0xFFF1F5F9),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(
                            color: isSelected
                                ? const Color(0xFF009048)
                                : const Color(0xFFE2E8F0),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),

                  const Text(
                    'Date Range',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0A2540),
                    ),
                  ),
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: () async {
                      final picked = await showDateRangePicker(
                        context: context,
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 1)),
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
                        setModalState(() {
                          tempRange = picked;
                        });
                      }
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.date_range_rounded, color: Color(0xFF64748B), size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              tempRange != null
                                  ? '${tempRange!.start.day}/${tempRange!.start.month}/${tempRange!.start.year} - ${tempRange!.end.day}/${tempRange!.end.month}/${tempRange!.end.year}'
                                  : 'Select date range (optional)',
                              style: TextStyle(
                                fontSize: 13,
                                color: tempRange != null ? const Color(0xFF0A2540) : const Color(0xFF94A3B8),
                                fontWeight: tempRange != null ? FontWeight.w600 : FontWeight.normal,
                              ),
                            ),
                          ),
                          if (tempRange != null)
                            GestureDetector(
                              onTap: () => setModalState(() => tempRange = null),
                              child: const Icon(Icons.clear_rounded, size: 18, color: Color(0xFF94A3B8)),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _selectedFilterType = 'All';
                              _selectedDateRange = null;
                            });
                            Navigator.pop(context);
                          },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Reset',
                            style: TextStyle(
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _selectedFilterType = tempType;
                              _selectedDateRange = tempRange;
                            });
                            Navigator.pop(context);
                          },
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            backgroundColor: const Color(0xFF009048),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Apply Filter',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0A2540), size: 24),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Transactions',
          style: TextStyle(
            color: Color(0xFF0A2540),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded, color: Color(0xFF0A2540), size: 24),
            onPressed: () => _showFilterModal(context),
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: TabBar(
            controller: _tabController,
            labelColor: const Color(0xFF009048),
            unselectedLabelColor: const Color(0xFF64748B),
            indicatorColor: const Color(0xFF009048),
            indicatorWeight: 3,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
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
          List<Map<String, dynamic>> allTxs = [];
          String currencySymbol = '₹';
          if (state is WalletLoaded) {
            allTxs = _parseTransactions(state.transactions);
            currencySymbol = state.currency == 'CAD' ? '\$' : '₹';
          }

          // Apply date range filter if selected
          if (_selectedDateRange != null) {
            allTxs = allTxs.where((t) {
              final rawDate = t['rawDate'] as DateTime;
              return rawDate.isAfter(_selectedDateRange!.start.subtract(const Duration(seconds: 1))) &&
                  rawDate.isBefore(_selectedDateRange!.end.add(const Duration(days: 1)));
            }).toList();
          }

          // Apply modal filter type if selected
          if (_selectedFilterType == 'Money In') {
            allTxs = allTxs.where((t) => t['isAdd'] == true).toList();
          } else if (_selectedFilterType == 'Money Out') {
            allTxs = allTxs.where((t) => t['isAdd'] == false).toList();
          }

          final moneyIn = allTxs.where((t) => t['isAdd'] == true).toList();
          final moneyOut = allTxs.where((t) => t['isAdd'] == false).toList();

          return RefreshIndicator(
            onRefresh: () async {
              context.read<WalletBloc>().add(LoadWalletDetails());
            },
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTransactionListView(allTxs, currencySymbol),
                _buildTransactionListView(moneyIn, currencySymbol),
                _buildTransactionListView(moneyOut, currencySymbol),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTransactionListView(List<Map<String, dynamic>> txList, String currencySymbol) {
    if (txList.isEmpty) {
      return Center(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.receipt_long_rounded, size: 56, color: Color(0xFFCBD5E1)),
                SizedBox(height: 16),
                Text(
                  'No Transactions Found',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0A2540),
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'Your wallet transactions will appear here',
                  style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    final grouped = _groupByMonth(txList);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: grouped.entries.map((entry) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                entry.key,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0A2540),
                ),
              ),
              const SizedBox(height: 12),
              ...entry.value.map((tx) => _buildTransactionCard(tx, currencySymbol)),
              const SizedBox(height: 20),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> tx, String currencySymbol) {
    final isAdd = tx['isAdd'] as bool;
    final assetPath = isAdd ? 'assets/icons/money-in.png' : 'assets/icons/cab-payment.png';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
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
            '${isAdd ? '+' : '-'} $currencySymbol${tx['amount']}',
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
