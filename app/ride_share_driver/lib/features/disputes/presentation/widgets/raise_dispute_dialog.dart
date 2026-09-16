import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../../ride/data/datasources/ride_remote_datasource.dart';

class RaiseDisputeDialog extends StatefulWidget {
  final String rideId;

  const RaiseDisputeDialog({Key? key, required this.rideId}) : super(key: key);

  static void show(BuildContext context, String rideId) {
    showDialog(
      context: context,
      builder: (_) => RaiseDisputeDialog(rideId: rideId),
    );
  }

  @override
  State<RaiseDisputeDialog> createState() => _RaiseDisputeDialogState();
}

class _RaiseDisputeDialogState extends State<RaiseDisputeDialog> {
  final RideRemoteDataSource _dataSource = sl<RideRemoteDataSource>();
  String _selectedReason = 'incorrect_fare';
  final TextEditingController _descController = TextEditingController();
  bool _isSubmitting = false;

  final Map<String, String> _reasons = {
    'incorrect_fare': 'Incorrect Fare / Payment Issue',
    'passenger_conduct': 'Passenger Behavior / Damage',
    'route_detour': 'Route / Location Discrepancy',
    'cancellation_fee': 'Unpaid Cancellation Fee',
    'other': 'Other Issue',
  };

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submitDispute() async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      await _dataSource.raiseDispute(
        rideId: widget.rideId,
        reason: _selectedReason,
        description: _descController.text.trim().isNotEmpty ? _descController.text.trim() : null,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Dispute submitted successfully! Our support team will review your case.'),
            backgroundColor: Color(0xFF009048),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit dispute: $e'),
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
      title: const Text('Raise Ride Dispute', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'If you experienced an issue with fare collection, rider conduct, or route calculation, select a reason below:',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            const Text('Reason for Dispute', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF334155))),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFCBD5E1)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedReason,
                  items: _reasons.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 14))))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedReason = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text('Additional Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF334155))),
            const SizedBox(height: 6),
            TextField(
              controller: _descController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Describe details of what happened...',
                hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitDispute,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF009048),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _isSubmitting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Submit Dispute', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
