import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/ride_remote_datasource.dart';
import '../../data/models/ride_receipt_model.dart';

class RideReceiptSheet extends StatefulWidget {
  final String rideId;

  const RideReceiptSheet({super.key, required this.rideId});

  static void show(BuildContext context, String rideId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RideReceiptSheet(rideId: rideId),
    );
  }

  @override
  State<RideReceiptSheet> createState() => _RideReceiptSheetState();
}

class _RideReceiptSheetState extends State<RideReceiptSheet> {
  final RideRemoteDataSource _dataSource = sl<RideRemoteDataSource>();
  bool _isLoading = true;
  String? _errorMessage;
  RideReceiptModel? _receipt;

  @override
  void initState() {
    super.initState();
    _fetchReceipt();
  }

  Future<void> _fetchReceipt() async {
    try {
      final json = await _dataSource.getRideReceipt(widget.rideId);
      setState(() {
        _receipt = RideReceiptModel.fromJson(json);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  String _formatCurrency(int amountMinor, String code) {
    final symbol = code.toUpperCase() == 'INR' ? '₹' : '\$';
    final val = (amountMinor / 100).toStringAsFixed(2);
    return '$symbol$val';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Ride Receipt',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const Divider(),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator(color: Color(0xFF009048))),
            )
          else if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
              ),
            )
          else if (_receipt != null)
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _receipt!.receiptId,
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                              ),
                              Text(
                                _receipt!.paymentMethod.toUpperCase(),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total Fare Collected', style: TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                              Text(
                                _formatCurrency(_receipt!.totalFareMinor, _receipt!.currencyCode),
                                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Route & Stats', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                    const SizedBox(height: 8),
                    _buildDetailRow(Icons.my_location_rounded, 'Pickup', _receipt!.pickupAddress),
                    const SizedBox(height: 8),
                    _buildDetailRow(Icons.location_on_rounded, 'Drop-off', _receipt!.dropAddress),
                    const SizedBox(height: 8),
                    _buildDetailRow(Icons.speed_rounded, 'Distance & Time', '${_receipt!.distanceKm.toStringAsFixed(1)} km • ${_receipt!.durationMin} mins'),
                    if (_receipt!.riderName != null) ...[
                      const SizedBox(height: 8),
                      _buildDetailRow(Icons.person_outline_rounded, 'Rider', _receipt!.riderName!),
                    ],
                    const SizedBox(height: 16),
                    const Text('Fare Itemization', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                    const SizedBox(height: 8),
                    _buildFareRow('Base Fare', _formatCurrency(_receipt!.baseFareMinor, _receipt!.currencyCode)),
                    if (_receipt!.distanceChargeMinor > 0)
                      _buildFareRow('Distance Charge', _formatCurrency(_receipt!.distanceChargeMinor, _receipt!.currencyCode)),
                    if (_receipt!.timeChargeMinor > 0)
                      _buildFareRow('Time Charge', _formatCurrency(_receipt!.timeChargeMinor, _receipt!.currencyCode)),
                    if (_receipt!.promoDiscountMinor > 0)
                      _buildFareRow('Promo Subsidy / Discount', '-${_formatCurrency(_receipt!.promoDiscountMinor, _receipt!.currencyCode)}', isDiscount: true),
                    const Divider(height: 24),
                    _buildFareRow('Total Earnings', _formatCurrency(_receipt!.totalFareMinor, _receipt!.currencyCode), isBold: true),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF64748B)),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF475569), fontSize: 13)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildFareRow(String label, String amount, {bool isDiscount = false, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isBold ? const Color(0xFF0F172A) : const Color(0xFF64748B),
            ),
          ),
          Text(
            amount,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              color: isDiscount ? const Color(0xFF009048) : (isBold ? const Color(0xFF0F172A) : const Color(0xFF334155)),
            ),
          ),
        ],
      ),
    );
  }
}
