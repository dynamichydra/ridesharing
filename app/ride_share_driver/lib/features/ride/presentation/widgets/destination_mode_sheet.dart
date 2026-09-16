import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/ride_remote_datasource.dart';
import '../../data/models/destination_mode_model.dart';

class DestinationModeSheet extends StatefulWidget {
  const DestinationModeSheet({super.key});

  static Future<void> show(BuildContext context) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const DestinationModeSheet(),
    );
  }

  @override
  State<DestinationModeSheet> createState() => _DestinationModeSheetState();
}

class _DestinationModeSheetState extends State<DestinationModeSheet> {
  final RideRemoteDataSource _dataSource = sl<RideRemoteDataSource>();
  final TextEditingController _addressController = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;
  DestinationModeModel? _currentMode;

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _loadStatus() async {
    try {
      final json = await _dataSource.getDestinationMode();
      setState(() {
        if (json != null) {
          _currentMode = DestinationModeModel.fromJson(json);
          if (_currentMode!.address != null) {
            _addressController.text = _currentMode!.address!;
          }
        }
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _setDestination() async {
    final address = _addressController.text.trim();
    if (address.isEmpty) return;

    setState(() {
      _isSaving = true;
    });

    try {
      await _dataSource.setDestinationMode(
        address: address,
        lat: 28.6139,
        lng: 77.2090,
      );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Destination filter set to $address. You will only receive rides heading this direction.'),
            backgroundColor: const Color(0xFF009048),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to set destination mode: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _clearDestination() async {
    setState(() {
      _isSaving = true;
    });

    try {
      await _dataSource.clearDestinationMode();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Destination mode cleared. Receiving all nearby ride requests.'),
            backgroundColor: Color(0xFF009048),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to clear destination mode: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isModeActive = _currentMode?.isActive == true;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
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
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isModeActive ? const Color(0xFFE6F4EA) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.navigation_rounded,
                  color: isModeActive ? const Color(0xFF009048) : const Color(0xFF64748B),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Destination Mode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
                    SizedBox(height: 2),
                    Text('Only receive trips heading towards your destination.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: Color(0xFF009048))))
          else ...[
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'Target Address / Home City',
                hintText: 'e.g. Connaught Place, New Delhi',
                prefixIcon: const Icon(Icons.location_on_rounded, color: Color(0xFF009048)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (isModeActive)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSaving ? null : _clearDestination,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Clear Filter', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    ),
                  ),
                if (isModeActive) const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _setDestination,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF009048),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: _isSaving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(isModeActive ? 'Update Destination' : 'Set Destination', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
