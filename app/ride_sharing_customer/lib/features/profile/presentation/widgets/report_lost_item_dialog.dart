import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/widgets/custom_toast.dart';

class ReportLostItemDialog extends StatefulWidget {
  final String rideId;

  const ReportLostItemDialog({super.key, required this.rideId});

  static Future<void> show(BuildContext context, String rideId) async {
    return showDialog(
      context: context,
      builder: (ctx) => ReportLostItemDialog(rideId: rideId),
    );
  }

  @override
  State<ReportLostItemDialog> createState() => _ReportLostItemDialogState();
}

class _ReportLostItemDialogState extends State<ReportLostItemDialog> {
  final _descCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _category = 'electronics';
  bool _isSubmitting = false;

  final List<Map<String, String>> _categories = const [
    {'key': 'electronics', 'label': 'Electronics (Phone, Laptop, Keys)'},
    {'key': 'wallet_cash', 'label': 'Wallet, Purse or Cash'},
    {'key': 'bag_luggage', 'label': 'Bag, Backpack or Luggage'},
    {'key': 'clothing', 'label': 'Clothing or Glasses'},
    {'key': 'other', 'label': 'Other Personal Belongings'},
  ];

  Future<void> _submitReport() async {
    final desc = _descCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();

    if (desc.isEmpty) {
      CustomToast.show(context, 'Please enter a description of the lost item');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final dioClient = sl<DioClient>();
      await dioClient.dio.post(
        '/api/v1/lost-items/rides/${widget.rideId}',
        data: {
          'itemCategory': _category,
          'description': desc,
          if (phone.isNotEmpty) 'contactPhone': phone,
        },
      );

      if (mounted) {
        Navigator.pop(context);
        CustomToast.show(context, 'Lost item report submitted! Our support team will reach out.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        CustomToast.show(context, 'Failed to submit lost item report: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: const [
          Icon(Icons.search_rounded, color: Color(0xFF009048)),
          SizedBox(width: 8),
          Text('Report Lost Item', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Item Category',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              value: _category,
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              items: _categories.map((c) {
                return DropdownMenuItem<String>(
                  value: c['key'],
                  child: Text(c['label']!, style: const TextStyle(fontSize: 13)),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _category = val);
              },
            ),
            const SizedBox(height: 14),
            const Text(
              'Description',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Describe color, brand, or distinguishing details...',
                hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Callback Phone Number',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                hintText: 'Phone number for driver/support to reach you',
                hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitReport,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF009048),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _isSubmitting
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Submit Report', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
