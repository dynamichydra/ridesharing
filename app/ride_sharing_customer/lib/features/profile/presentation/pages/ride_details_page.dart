import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../widgets/report_lost_item_dialog.dart';

class RideDetailsPage extends StatefulWidget {
  final String rideId;

  const RideDetailsPage({super.key, required this.rideId});

  @override
  State<RideDetailsPage> createState() => _RideDetailsPageState();
}

class _RideDetailsPageState extends State<RideDetailsPage> {
  Map<String, dynamic>? _rideData;
  Map<String, dynamic>? _receiptData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRideDetails();
  }

  Future<void> _loadRideDetails() async {
    setState(() => _isLoading = true);
    try {
      final dioClient = sl<DioClient>();
      final res = await dioClient.dio.get('/api/v1/rides/${widget.rideId}');
      if (res.data != null && (res.data['SUCCESS'] == true || res.data['success'] == true)) {
        _rideData = Map<String, dynamic>.from((res.data['MESSAGE'] ?? res.data['DATA']) as Map);
      }

      final recRes = await dioClient.dio.get('/api/v1/rides/${widget.rideId}/receipt');
      if (recRes.data != null && (recRes.data['SUCCESS'] == true || recRes.data['success'] == true)) {
        _receiptData = Map<String, dynamic>.from((recRes.data['MESSAGE'] ?? recRes.data['DATA']) as Map);
      }
    } catch (e) {
      CustomToast.show(context, 'Error loading ride details');
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ride Details')),
        body: const LoadingView(),
      );
    }

    final data = _rideData ?? {};
    final status = (data['status'] ?? 'completed').toString().toUpperCase();
    final pickup = data['pickupAddress'] ?? data['pickup_address'] ?? 'Pickup';
    final dropoff = data['dropoffAddress'] ?? data['drop_address'] ?? 'Destination';
    final requestedAt = data['requestedAt'] ?? data['requested_at'] ?? '';
    final driver = data['driver'] as Map<String, dynamic>?;

    final estFareMinor = (data['estimatedFareMinor'] ?? data['estimated_fare_minor'] ?? 0) as num;
    final finalFareMinor = (data['finalFareMinor'] ?? data['final_fare_minor'] ?? estFareMinor) as num;
    final fare = finalFareMinor > 0 ? (finalFareMinor / 100) : (estFareMinor / 100);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ride Breakdown', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
      ),
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: status == 'COMPLETED'
                              ? const Color(0xFFDCFCE7)
                              : (status == 'CANCELLED' ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: status == 'COMPLETED'
                                ? const Color(0xFF166534)
                                : (status == 'CANCELLED' ? const Color(0xFF991B1B) : const Color(0xFF92400E)),
                          ),
                        ),
                      ),
                      Text(
                        '₹${fare.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  if (requestedAt.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Requested on ${requestedAt.toString().substring(0, requestedAt.toString().length > 10 ? 10 : requestedAt.toString().length)}',
                      style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Route Addresses
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.circle, color: Color(0xFF009048), size: 14),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(pickup.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.only(left: 6.0),
                    child: Align(alignment: Alignment.centerLeft, child: SizedBox(height: 16, child: VerticalDivider(thickness: 1.5))),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.square, color: Color(0xFFE53935), size: 14),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(dropoff.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Driver Card
            if (driver != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 24,
                      backgroundColor: Color(0xFFE2E8F0),
                      child: Icon(Icons.person_rounded, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(driver['name']?.toString() ?? 'Driver', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('${driver['vehicleModel'] ?? 'Vehicle'} • ${driver['vehicleNumber'] ?? ''}', style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),

            // Fare Receipt Breakdown
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Invoice Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                  const SizedBox(height: 12),
                  _buildRow('Base Fare', '₹${((fare * 0.70)).toStringAsFixed(0)}'),
                  _buildRow('Distance & Time', '₹${((fare * 0.30)).toStringAsFixed(0)}'),
                  const Divider(height: 20),
                  _buildRow('Total Paid', '₹${fare.toStringAsFixed(0)}', isBold: true),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Report Lost Item Action Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () => ReportLostItemDialog.show(context, widget.rideId),
                icon: const Icon(Icons.search_rounded, color: Color(0xFFE53935)),
                label: const Text('Report Lost Item on This Ride', style: TextStyle(color: Color(0xFFE53935), fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFE53935)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: isBold ? const Color(0xFF0F172A) : const Color(0xFF64748B), fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontSize: 14, color: const Color(0xFF0F172A), fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}
