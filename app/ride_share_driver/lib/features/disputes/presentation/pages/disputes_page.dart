import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../../ride/data/datasources/ride_remote_datasource.dart';
import '../../../ride/data/models/ride_dispute_model.dart';

class DisputesPage extends StatefulWidget {
  const DisputesPage({Key? key}) : super(key: key);

  @override
  State<DisputesPage> createState() => _DisputesPageState();
}

class _DisputesPageState extends State<DisputesPage> {
  final RideRemoteDataSource _dataSource = sl<RideRemoteDataSource>();
  bool _isLoading = true;
  String? _errorMessage;
  List<RideDisputeModel> _disputes = [];

  @override
  void initState() {
    super.initState();
    _loadDisputes();
  }

  Future<void> _loadDisputes() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _dataSource.getMyDisputes();
      setState(() {
        _disputes = list.map((item) => RideDisputeModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'resolved':
        return const Color(0xFF009048);
      case 'rejected':
        return Colors.red;
      default:
        return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Ride Disputes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A)),
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
                      Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _loadDisputes,
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF009048)),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDisputes,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_disputes.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.assignment_turned_in_outlined, size: 48, color: Color(0xFF94A3B8)),
                              SizedBox(height: 12),
                              Text('No Ride Disputes Filed', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A))),
                              SizedBox(height: 4),
                              Text('Disputes raised for trip fare errors or rider issues will appear here.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                            ],
                          ),
                        )
                      else
                        ..._disputes.map((d) => _buildDisputeCard(d)),
                    ],
                  ),
                ),
    );
  }

  Widget _buildDisputeCard(RideDisputeModel dispute) {
    final color = _getStatusColor(dispute.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
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
              Text(
                'Ride #${dispute.rideId.substring(0, dispute.rideId.length > 8 ? 8 : dispute.rideId.length).toUpperCase()}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  dispute.status.toUpperCase(),
                  style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Reason: ${dispute.reason.replaceAll('_', ' ').toUpperCase()}',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155)),
          ),
          if (dispute.description != null && dispute.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              dispute.description!,
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
          ],
          if (dispute.adminNotes != null && dispute.adminNotes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.admin_panel_settings_rounded, size: 16, color: Color(0xFF009048)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Support Note: ${dispute.adminNotes!}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF0F172A)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
