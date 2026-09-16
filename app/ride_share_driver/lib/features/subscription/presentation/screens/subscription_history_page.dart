import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/subscription_remote_datasource.dart';

class SubscriptionHistoryPage extends StatefulWidget {
  const SubscriptionHistoryPage({super.key});

  @override
  State<SubscriptionHistoryPage> createState() => _SubscriptionHistoryPageState();
}

class _SubscriptionHistoryPageState extends State<SubscriptionHistoryPage> {
  final SubscriptionRemoteDataSource _dataSource = sl<SubscriptionRemoteDataSource>();
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _history = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _dataSource.getSubscriptionHistory();
      if (mounted) {
        setState(() {
          _history = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String _formatDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return 'N/A';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return isoString.length > 10 ? isoString.substring(0, 10) : isoString;
    }
  }

  String _formatCurrency(num minor, String currencyCode) {
    final sym = currencyCode.toUpperCase() == 'INR' ? '₹' : '\$';
    final amountMajor = (minor / 100).toStringAsFixed(2);
    return '$sym$amountMajor';
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return const Color(0xFF009048);
      case 'trialing':
        return const Color(0xFF2563EB);
      case 'expired':
        return const Color(0xFF64748B);
      case 'past_due':
      case 'payment_failed':
      case 'cancelled':
        return const Color(0xFFDC2626);
      default:
        return const Color(0xFF009048);
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return const Color(0xFFDCFCE7);
      case 'trialing':
        return const Color(0xFFEFF6FF);
      case 'expired':
        return const Color(0xFFF1F5F9);
      case 'past_due':
      case 'payment_failed':
      case 'cancelled':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFDCFCE7);
    }
  }

  void _showInvoiceDetails(Map<String, dynamic> item) {
    final subMap = item['subscription'] is Map ? Map<String, dynamic>.from(item['subscription'] as Map) : null;
    final planMap = item['plan'] is Map ? Map<String, dynamic>.from(item['plan'] as Map) : null;

    final planName = planMap?['name']?.toString() ?? subMap?['planName'] ?? item['planName'] ?? item['name'] ?? 'Subscription Plan';
    final status = subMap?['status']?.toString() ?? item['status'] ?? 'active';
    final amountMinor = (subMap?['amountMinor'] ?? planMap?['priceMinor'] ?? item['amountMinor'] ?? item['priceMinor'] ?? 0) as num;
    final currencyCode = subMap?['currencyCode']?.toString() ?? planMap?['currencyCode']?.toString() ?? 'INR';
    final startDateStr = subMap?['startDate']?.toString() ?? subMap?['createdAt']?.toString() ?? item['createdAt']?.toString();
    final endDateStr = subMap?['endDate']?.toString() ?? subMap?['currentPeriodEnd']?.toString();
    final subId = subMap?['id']?.toString() ?? item['id']?.toString() ?? 'N/A';
    final planType = planMap?['type']?.toString() ?? 'driver_plan';
    final autoRenew = subMap?['autoRenew'] == true;
    final features = (planMap?['features'] as List?)?.map((e) => e.toString()).toList() ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(sheetCtx).size.height * 0.85,
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Grab handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Subscription Invoice',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusBgColor(status),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        color: _getStatusColor(status),
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Hero Amount Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Text(
                      planName,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatCurrency(amountMinor, currencyCode),
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Color(0xFF009048)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Billing Type: ${planType.toUpperCase()}${autoRenew ? " • Auto-Renews" : ""}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              const Text('Details & Audit', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              const SizedBox(height: 10),

              _buildDetailRow(Icons.calendar_today_rounded, 'Start Date', _formatDate(startDateStr)),
              const SizedBox(height: 8),
              _buildDetailRow(Icons.event_available_rounded, 'End / Expiry Date', _formatDate(endDateStr)),
              const SizedBox(height: 8),
              _buildDetailRow(Icons.numbers_rounded, 'Subscription Ref ID', subId.length > 18 ? '${subId.substring(0, 18)}...' : subId),

              if (features.isNotEmpty) ...[
                const SizedBox(height: 20),
                const Text('Included Plan Features', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                const SizedBox(height: 10),
                ...features.map(
                  (f) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Color(0xFF009048), size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            f,
                            style: const TextStyle(fontSize: 13, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pop(sheetCtx),
                  child: const Text('Close Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF64748B)),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Subscription History',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF009048)))
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.red, fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _loadHistory,
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF009048)),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadHistory,
                  color: const Color(0xFF009048),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      if (_history.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.receipt_long_rounded, size: 48, color: Color(0xFF94A3B8)),
                              SizedBox(height: 12),
                              Text(
                                'No Past Subscription Invoices',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Your past subscription payments and renewals will be listed here.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        )
                      else
                        ..._history.map(
                          (item) => _buildInvoiceCard(Map<String, dynamic>.from(item as Map)),
                        ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildInvoiceCard(Map<String, dynamic> item) {
    final subMap = item['subscription'] is Map ? Map<String, dynamic>.from(item['subscription'] as Map) : null;
    final planMap = item['plan'] is Map ? Map<String, dynamic>.from(item['plan'] as Map) : null;

    final planName = planMap?['name']?.toString() ?? subMap?['planName'] ?? item['planName'] ?? item['name'] ?? 'Subscription Plan';
    final status = subMap?['status']?.toString() ?? item['status'] ?? 'active';
    final amountMinor = (subMap?['amountMinor'] ?? planMap?['priceMinor'] ?? item['amountMinor'] ?? item['priceMinor'] ?? 0) as num;
    final currencyCode = subMap?['currencyCode']?.toString() ?? planMap?['currencyCode']?.toString() ?? 'INR';
    final startDateStr = subMap?['startDate']?.toString() ?? subMap?['createdAt']?.toString() ?? item['createdAt']?.toString();
    final endDateStr = subMap?['endDate']?.toString() ?? subMap?['currentPeriodEnd']?.toString();

    final formattedAmount = _formatCurrency(amountMinor, currencyCode);
    final formattedDate = _formatDate(startDateStr);
    final formattedEndDate = _formatDate(endDateStr);

    return InkWell(
      onTap: () => _showInvoiceDetails(item),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
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
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _getStatusBgColor(status),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.workspace_premium_rounded, color: _getStatusColor(status), size: 26),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        planName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        formattedAmount,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        endDateStr != null ? '$formattedDate • Till $formattedEndDate' : formattedDate,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w400),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getStatusBgColor(status),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: TextStyle(color: _getStatusColor(status), fontWeight: FontWeight.bold, fontSize: 10),
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
}
