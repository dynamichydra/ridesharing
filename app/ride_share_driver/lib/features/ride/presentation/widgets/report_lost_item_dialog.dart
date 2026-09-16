import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/ride_remote_datasource.dart';

class ReportLostItemDialog extends StatefulWidget {
  final String rideId;

  const ReportLostItemDialog({super.key, required this.rideId});

  static void show(BuildContext context, String rideId) {
    showDialog(
      context: context,
      builder: (_) => ReportLostItemDialog(rideId: rideId),
    );
  }

  @override
  State<ReportLostItemDialog> createState() => _ReportLostItemDialogState();
}

class _ReportLostItemDialogState extends State<ReportLostItemDialog> {
  final RideRemoteDataSource _dataSource = sl<RideRemoteDataSource>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submitReport() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Item name is required')));
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _dataSource.reportLostItem(
        rideId: widget.rideId,
        itemName: name,
        description: _descController.text.trim().isNotEmpty ? _descController.text.trim() : null,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lost item report submitted! Our support team will coordinate return.'),
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
          SnackBar(content: Text('Failed to submit report: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text('Report Left-Behind Item', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Found a wallet, phone, or bag left by a passenger after completing a trip?',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Item Name (e.g. Blue Backpack, Phone)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Description / Seat Location',
                hintText: 'e.g. Found on back seat right side...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
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
          onPressed: _isSubmitting ? null : _submitReport,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF009048),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _isSubmitting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Submit Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
