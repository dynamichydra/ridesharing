import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class EarningsPage extends StatefulWidget {
  const EarningsPage({super.key});

  @override
  State<EarningsPage> createState() => _EarningsPageState();
}

class _EarningsPageState extends State<EarningsPage> {
  String _selectedRange = 'Daily'; // 'Daily', 'Weekly', 'Monthly', 'Custom'
  String _selectedEarningsFilter = 'All';
  DateTime? _selectedDate;

  final double _totalEarnings = 1250.0;
  final int _totalRides = 12;
  final String _onlineDuration = '8h 32m';

  final double _baseFare = 720.0;
  final double _distanceFare = 380.0;
  final double _timeFare = 120.0;
  final double _incentives = 30.0;
  final double _adjustments = 0.0;

  void _showEarningsFilterModal(BuildContext context) {
    String tempRange = _selectedRange;
    String tempEarnings = _selectedEarningsFilter;
    DateTime? tempDate = _selectedDate ?? DateTime(2025, 5, 18);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
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
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF021B47)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                      const Text(
                        'Earnings Filters',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF021B47),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          setModalState(() {
                            tempRange = 'Daily';
                            tempEarnings = 'All';
                            tempDate = null;
                          });
                        },
                        child: const Text('Reset', style: TextStyle(color: Color(0xFF009048), fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 1. Select Range: Daily, Weekly, Monthly, Custom
                  const Text('Select Range', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),
                  Row(
                    children: ['Daily', 'Weekly', 'Monthly', 'Custom'].map((r) {
                      final isSelected = tempRange == r;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(r),
                          selected: isSelected,
                          onSelected: (_) => setModalState(() => tempRange = r),
                          selectedColor: const Color(0xFF009048),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF021B47),
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          ),
                          backgroundColor: const Color(0xFFF1F5F9),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),

                  // 2. Date
                  const Text('Date', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: tempDate ?? DateTime(2025, 5, 18),
                        firstDate: DateTime(2023),
                        lastDate: DateTime.now().add(const Duration(days: 1)),
                      );
                      if (picked != null) {
                        setModalState(() => tempDate = picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            tempDate != null
                                ? '${tempDate!.day} May 2025'
                                : '18 May 2025',
                            style: const TextStyle(fontSize: 13, color: Color(0xFF021B47)),
                          ),
                          const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF8A94A6)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 3. Earnings Range
                  const Text('Earnings Range', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: ['All', '₹0 - ₹500', '₹500 - ₹1500', '₹1500+'].map((r) {
                      final isSelected = tempEarnings == r;
                      return ChoiceChip(
                        label: Text(r),
                        selected: isSelected,
                        onSelected: (_) => setModalState(() => tempEarnings = r),
                        selectedColor: const Color(0xFF009048),
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : const Color(0xFF021B47),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                        backgroundColor: const Color(0xFFF1F5F9),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  // Apply Filters Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _selectedRange = tempRange;
                          _selectedEarningsFilter = tempEarnings;
                          _selectedDate = tempDate;
                        });
                        Navigator.pop(ctx);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: const Text('Apply Filters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47), size: 26),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: const Text(
          'Earnings',
          style: TextStyle(
            color: Color(0xFF021B47),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today_rounded, color: Color(0xFF021B47), size: 22),
            onPressed: () => _showEarningsFilterModal(context),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Segmented Range Tabs: Daily, Weekly, Monthly, Custom
            Row(
              children: ['Daily', 'Weekly', 'Monthly', 'Custom'].map((tab) {
                final isSelected = _selectedRange == tab;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedRange = tab;
                        });
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF009048) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E7E9),
                          ),
                        ),
                        child: Text(
                          tab,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? Colors.white : const Color(0xFF535E79),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // 2. Green Hero Card: Today's Earnings ₹1,250
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
              decoration: BoxDecoration(
                color: const Color(0xFF009048),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF009048).withValues(alpha: 0.20),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  const Text(
                    "Today's Earnings",
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '₹${_totalEarnings.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$_totalRides Rides',
                        style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(width: 24),
                      Text(
                        '$_onlineDuration Online',
                        style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Earnings Summary Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E7E9)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Earnings Summary',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF021B47),
                    ),
                  ),
                  const SizedBox(height: 14),
                  _buildSummaryRow('Base Fare', '₹${_baseFare.toStringAsFixed(0)}'),
                  _buildSummaryRow('Distance Fare', '₹${_distanceFare.toStringAsFixed(0)}'),
                  _buildSummaryRow('Time Fare', '₹${_timeFare.toStringAsFixed(0)}'),
                  _buildSummaryRow('Incentives', '₹${_incentives.toStringAsFixed(0)}'),
                  _buildSummaryRow('Adjustments', '- ₹${_adjustments.toStringAsFixed(0)}'),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Earnings',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF021B47),
                        ),
                      ),
                      Text(
                        '₹${_totalEarnings.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF009048),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6))),
          Text(val, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47))),
        ],
      ),
    );
  }
}
