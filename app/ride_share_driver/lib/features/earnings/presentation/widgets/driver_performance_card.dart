import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/earnings_remote_datasource.dart';
import '../../data/models/driver_performance_model.dart';

class DriverPerformanceCard extends StatefulWidget {
  const DriverPerformanceCard({super.key});

  @override
  State<DriverPerformanceCard> createState() => _DriverPerformanceCardState();
}

class _DriverPerformanceCardState extends State<DriverPerformanceCard> {
  final EarningsRemoteDataSource _dataSource = sl<EarningsRemoteDataSource>();
  bool _isLoading = true;
  DriverPerformanceModel? _performance;

  @override
  void initState() {
    super.initState();
    _loadPerformance();
  }

  Future<void> _loadPerformance() async {
    try {
      final json = await _dataSource.getDriverPerformance();
      setState(() {
        _performance = DriverPerformanceModel.fromJson(json);
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox.shrink();
    }

    final p = _performance ?? DriverPerformanceModel.fromJson({});

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.analytics_rounded, color: Color(0xFF009048), size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Performance Metrics',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 18),
                  const SizedBox(width: 4),
                  Text(
                    p.rating.toStringAsFixed(1),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildMetricRing('Acceptance', '${p.acceptanceRate.toStringAsFixed(0)}%', p.acceptanceRate / 100, const Color(0xFF009048)),
              _buildMetricRing('Completion', '${p.completionRate.toStringAsFixed(0)}%', p.completionRate / 100, const Color(0xFF3B82F6)),
              _buildMetricRing('Cancellation', '${p.cancellationRate.toStringAsFixed(0)}%', p.cancellationRate / 100, Colors.red),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricRing(String label, String valueText, double percent, Color color) {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: 52,
              height: 52,
              child: CircularProgressIndicator(
                value: percent.clamp(0.0, 1.0),
                strokeWidth: 5,
                backgroundColor: color.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            Text(
              valueText,
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
