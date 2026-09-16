import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/ride_remote_datasource.dart';
import '../../data/models/lost_item_model.dart';

class LostItemsPage extends StatefulWidget {
  const LostItemsPage({super.key});

  @override
  State<LostItemsPage> createState() => _LostItemsPageState();
}

class _LostItemsPageState extends State<LostItemsPage> {
  final RideRemoteDataSource _dataSource = sl<RideRemoteDataSource>();
  bool _isLoading = true;
  String? _errorMessage;
  List<LostItemModel> _items = [];

  @override
  void initState() {
    super.initState();
    _loadLostItems();
  }

  Future<void> _loadLostItems() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _dataSource.getMyLostItems();
      setState(() {
        _items = list.map((item) => LostItemModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
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
      case 'returned':
      case 'resolved':
        return const Color(0xFF009048);
      case 'found':
        return const Color(0xFF3B82F6);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Lost Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
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
                        onPressed: _loadLostItems,
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF009048)),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadLostItems,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_items.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.card_travel_rounded, size: 48, color: Color(0xFF94A3B8)),
                              SizedBox(height: 12),
                              Text('No Lost Items Reported', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A))),
                              SizedBox(height: 4),
                              Text('Items reported as left behind during rides will be tracked here.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                            ],
                          ),
                        )
                      else
                        ..._items.map((item) => _buildItemCard(item)),
                    ],
                  ),
                ),
    );
  }

  Widget _buildItemCard(LostItemModel item) {
    final color = _getStatusColor(item.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
              Text(
                item.itemName,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  item.status.toUpperCase(),
                  style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Ride #${item.rideId.substring(0, item.rideId.length > 8 ? 8 : item.rideId.length).toUpperCase()}',
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          if (item.description != null && item.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              item.description!,
              style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
            ),
          ],
        ],
      ),
    );
  }
}
