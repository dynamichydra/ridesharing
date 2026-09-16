import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/auth_remote_datasource.dart';

class DeviceManagementScreen extends StatefulWidget {
  const DeviceManagementScreen({super.key});

  @override
  State<DeviceManagementScreen> createState() => _DeviceManagementScreenState();
}

class _DeviceManagementScreenState extends State<DeviceManagementScreen> {
  final AuthRemoteDataSource _dataSource = sl<AuthRemoteDataSource>();
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _devices = [];

  @override
  void initState() {
    super.initState();
    _loadDevices();
  }

  Future<void> _loadDevices() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _dataSource.getDevices();
      setState(() {
        _devices = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _revokeDevice(String deviceId, String name) async {
    try {
      await _dataSource.revokeDevice(deviceId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Session for $name revoked'),
            backgroundColor: const Color(0xFF009048),
          ),
        );
      }
      _loadDevices();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to revoke session: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Active Device Sessions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
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
                        onPressed: _loadDevices,
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF009048)),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDevices,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text(
                        'Logged-in Devices',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Manage active devices logged into your Ryva driver account.',
                        style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 16),
                      if (_devices.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.devices_rounded, size: 48, color: Color(0xFF94A3B8)),
                              SizedBox(height: 12),
                              Text('No active device sessions found', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                            ],
                          ),
                        )
                      else
                        ..._devices.map((d) => _buildDeviceCard(Map<String, dynamic>.from(d as Map))),
                    ],
                  ),
                ),
    );
  }

  Widget _buildDeviceCard(Map<String, dynamic> device) {
    final deviceId = device['id']?.toString() ?? device['deviceId']?.toString() ?? '';
    final name = device['deviceName']?.toString() ?? device['name']?.toString() ?? 'Mobile Device';
    final ip = device['ipAddress']?.toString() ?? device['ip']?.toString() ?? 'Unknown IP';
    final isCurrent = device['isCurrent'] == true;
    final lastActive = device['lastActiveAt']?.toString() ?? device['updatedAt']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrent ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
          width: isCurrent ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isCurrent ? const Color(0xFFE6F4EA) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.smartphone_rounded,
              color: isCurrent ? const Color(0xFF009048) : const Color(0xFF64748B),
              size: 26,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                    ),
                    if (isCurrent)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF009048),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text('THIS DEVICE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10)),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('IP: $ip', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                if (lastActive.isNotEmpty)
                  Text('Last Active: $lastActive', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
          if (!isCurrent && deviceId.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.logout_rounded, color: Colors.red),
              tooltip: 'Revoke Session',
              onPressed: () => _revokeDevice(deviceId, name),
            ),
        ],
      ),
    );
  }
}
