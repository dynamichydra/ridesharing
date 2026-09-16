import 'package:flutter/material.dart';
import '../../../injection_container.dart';
import '../../../domain/entities/vehicle.dart';
import '../../../domain/repositories/onboarding_repository.dart';

class VehicleManagementScreen extends StatefulWidget {
  const VehicleManagementScreen({super.key});

  @override
  State<VehicleManagementScreen> createState() => _VehicleManagementScreenState();
}

class _VehicleManagementScreenState extends State<VehicleManagementScreen> {
  final OnboardingRepository _repository = sl<OnboardingRepository>();
  bool _isLoading = true;
  String? _errorMessage;
  List<DriverVehicle> _vehicles = [];
  String? _activatingVehicleId;

  @override
  void initState() {
    super.initState();
    _loadVehicles();
  }

  Future<void> _loadVehicles() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final vehicles = await _repository.getMyVehicles();
      setState(() {
        _vehicles = vehicles;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _activateVehicle(DriverVehicle vehicle) async {
    if (vehicle.isActive == true) return;

    setState(() {
      _activatingVehicleId = vehicle.id;
    });

    try {
      await _repository.activateVehicle(vehicle.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${vehicle.model} (${vehicle.registrationNumber}) is now active'),
            backgroundColor: const Color(0xFF009048),
          ),
        );
      }
      await _loadVehicles();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to activate vehicle: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _activatingVehicleId = null;
        });
      }
    }
  }

  void _showAddVehicleDialog() async {
    final modelController = TextEditingController();
    final yearController = TextEditingController();
    final regController = TextEditingController();
    final colorController = TextEditingController();

    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Add Vehicle', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: modelController,
                      decoration: const InputDecoration(labelText: 'Make / Model (e.g. Toyota Camry)', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: yearController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Year (e.g. 2022)', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: regController,
                      decoration: const InputDecoration(labelText: 'Registration Number / Plate', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: colorController,
                      decoration: const InputDecoration(labelText: 'Color (e.g. Silver)', border: OutlineInputBorder()),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(dialogCtx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (modelController.text.trim().isEmpty || regController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Model and Registration number are required')),
                            );
                            return;
                          }

                          setDialogState(() => isSubmitting = true);
                          try {
                            final config = await _repository.getOnboardingConfig();
                            final vehicleTypeId = config.vehicleTypes.isNotEmpty ? config.vehicleTypes.first.id : 'vt_car';

                            await _repository.addVehicle(
                              vehicleTypeId: vehicleTypeId,
                              model: modelController.text.trim(),
                              year: yearController.text.trim().isNotEmpty ? yearController.text.trim() : '2022',
                              registrationNumber: regController.text.trim(),
                              color: colorController.text.trim().isNotEmpty ? colorController.text.trim() : null,
                            );

                            if (mounted) {
                              Navigator.pop(dialogCtx);
                              _loadVehicles();
                            }
                          } catch (e) {
                            setDialogState(() => isSubmitting = false);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Failed to add vehicle: $e'), backgroundColor: Colors.red),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF009048)),
                  child: isSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Add Vehicle', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showEditVehicleDialog(DriverVehicle vehicle) async {
    final modelController = TextEditingController(text: vehicle.model);
    final yearController = TextEditingController(text: vehicle.year);
    final regController = TextEditingController(text: vehicle.registrationNumber);
    final colorController = TextEditingController(text: vehicle.color ?? '');

    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Edit Vehicle', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: modelController,
                      decoration: const InputDecoration(labelText: 'Make / Model', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: yearController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Year', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: regController,
                      decoration: const InputDecoration(labelText: 'Registration Number / Plate', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: colorController,
                      decoration: const InputDecoration(labelText: 'Color', border: OutlineInputBorder()),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(dialogCtx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (modelController.text.trim().isEmpty || regController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Model and Registration number are required')),
                            );
                            return;
                          }

                          setDialogState(() => isSubmitting = true);
                          try {
                            await _repository.updateVehicle(
                              vehicle.id,
                              model: modelController.text.trim(),
                              year: yearController.text.trim(),
                              registrationNumber: regController.text.trim(),
                              color: colorController.text.trim().isNotEmpty ? colorController.text.trim() : null,
                            );

                            if (mounted) {
                              Navigator.pop(dialogCtx);
                              _loadVehicles();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Vehicle updated successfully'),
                                  backgroundColor: Color(0xFF009048),
                                ),
                              );
                            }
                          } catch (e) {
                            setDialogState(() => isSubmitting = false);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Failed to update vehicle: $e'), backgroundColor: Colors.red),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF009048)),
                  child: isSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save Changes', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Vehicles', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
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
                        onPressed: _loadVehicles,
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF009048)),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadVehicles,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text(
                        'Active Driving Vehicle',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Select which vehicle you are currently driving to receive matching ride requests.',
                        style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 16),
                      if (_vehicles.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.directions_car_outlined, size: 48, color: Color(0xFF94A3B8)),
                              SizedBox(height: 12),
                              Text('No vehicles added yet', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                            ],
                          ),
                        )
                      else
                        ..._vehicles.map((v) => _buildVehicleCard(v)),
                      const SizedBox(height: 20),
                      OutlinedButton.icon(
                        onPressed: _showAddVehicleDialog,
                        icon: const Icon(Icons.add_rounded, color: Color(0xFF009048)),
                        label: const Text('Add Another Vehicle', style: TextStyle(color: Color(0xFF009048), fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: const BorderSide(color: Color(0xFF009048), width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Future<void> _deleteVehicle(DriverVehicle vehicle) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Vehicle'),
        content: Text('Are you sure you want to remove ${vehicle.model} (${vehicle.registrationNumber})?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _repository.deleteVehicle(vehicle.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${vehicle.model} deleted'), backgroundColor: const Color(0xFF009048)),
        );
      }
      _loadVehicles();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete vehicle: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showInspectionsDialog(DriverVehicle vehicle) async {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('${vehicle.model} Inspections', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: FutureBuilder<List<dynamic>>(
          future: _repository.getVehicleInspections(vehicle.id),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(height: 100, child: Center(child: CircularProgressIndicator(color: Color(0xFF009048))));
            }
            if (snapshot.hasError) {
              return Text('Error loading inspections: ${snapshot.error}', style: const TextStyle(color: Colors.red));
            }
            final list = snapshot.data ?? [];
            if (list.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Text('No inspection logs found for this vehicle.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B))),
              );
            }
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: list.map((item) {
                final map = Map<String, dynamic>.from(item as Map);
                return ListTile(
                  leading: const Icon(Icons.verified_rounded, color: Color(0xFF009048)),
                  title: Text(map['status']?.toString().toUpperCase() ?? 'PASSED', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(map['createdAt']?.toString() ?? 'Inspected'),
                );
              }).toList(),
            );
          },
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _buildVehicleCard(DriverVehicle vehicle) {
    final isActive = vehicle.isActive == true;
    final isActivating = _activatingVehicleId == vehicle.id;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
          width: isActive ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isActive ? const Color(0xFFE6F4EA) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.directions_car_filled_rounded,
                  color: isActive ? const Color(0xFF009048) : const Color(0xFF64748B),
                  size: 28,
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
                            vehicle.model,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                          ),
                        ),
                        if (isActive)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF009048),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'ACTIVE',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${vehicle.registrationNumber} • ${vehicle.year}${vehicle.color != null ? " • ${vehicle.color}" : ""}',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: () => _showEditVehicleDialog(vehicle),
                icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFF009048)),
                label: const Text('Edit', style: TextStyle(color: Color(0xFF009048), fontSize: 12, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 4),
              TextButton.icon(
                onPressed: () => _showInspectionsDialog(vehicle),
                icon: const Icon(Icons.fact_check_outlined, size: 16, color: Color(0xFF64748B)),
                label: const Text('Inspections', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              ),
              if (!isActive) ...[
                const SizedBox(width: 4),
                TextButton.icon(
                  onPressed: () => _deleteVehicle(vehicle),
                  icon: const Icon(Icons.delete_outline_rounded, size: 16, color: Colors.red),
                  label: const Text('Delete', style: TextStyle(color: Colors.red, fontSize: 12)),
                ),
              ],
            ],
          ),
          if (!isActive) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isActivating ? null : () => _activateVehicle(vehicle),
                icon: isActivating
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check_circle_outline_rounded, size: 18),
                label: Text(isActivating ? 'Activating...' : 'Activate This Vehicle'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF009048),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
