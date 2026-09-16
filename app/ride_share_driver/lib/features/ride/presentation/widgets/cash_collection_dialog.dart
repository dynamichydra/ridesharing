import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/ride_remote_datasource.dart';

class CashCollectionDialog extends StatefulWidget {
  final String rideId;
  final String fareText;
  final VoidCallback onCollectionConfirmed;

  const CashCollectionDialog({
    super.key,
    required this.rideId,
    required this.fareText,
    required this.onCollectionConfirmed,
  });

  static Future<void> show({
    required BuildContext context,
    required String rideId,
    required String fareText,
    required VoidCallback onCollectionConfirmed,
  }) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => CashCollectionDialog(
        rideId: rideId,
        fareText: fareText,
        onCollectionConfirmed: onCollectionConfirmed,
      ),
    );
  }

  @override
  State<CashCollectionDialog> createState() => _CashCollectionDialogState();
}

class _CashCollectionDialogState extends State<CashCollectionDialog> {
  final RideRemoteDataSource _dataSource = sl<RideRemoteDataSource>();
  bool _isProcessing = false;

  Future<void> _confirmCashCollection() async {
    setState(() {
      _isProcessing = true;
    });

    try {
      await _dataSource.recordCashCollection(widget.rideId);
      if (mounted) {
        Navigator.pop(context);
        widget.onCollectionConfirmed();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Cash recording failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Row(
        children: [
          Icon(Icons.payments_rounded, color: Color(0xFF009048), size: 28),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Collect Cash Fare',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A)),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE6F4EA),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF009048).withOpacity(0.3)),
            ),
            child: Column(
              children: [
                const Text('Amount to Collect from Passenger', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                const SizedBox(height: 4),
                Text(
                  widget.fareText,
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Confirming will log the cash collection in your wallet ledger and calculate platform commission settlement.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
          ),
        ],
      ),
      actions: [
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _isProcessing ? null : _confirmCashCollection,
            icon: _isProcessing
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            label: Text(
              _isProcessing ? 'Recording...' : 'CONFIRM CASH RECEIVED',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 0.5),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF009048),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }
}
