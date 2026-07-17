import 'package:flutter/material.dart';
import '../../../../style/appcolors.dart';
import '../../domain/entities/active_ride.dart';

/// Full-screen takeover shown in place of the dashboard while a ride is
/// accepted/arriving/started, or briefly on completion. One screen whose
/// primary action changes with `ride.status` — mirrors how the backend
/// itself models the lifecycle as a single mutable status field rather than
/// separate accepted/arriving/started resources.
class ActiveRideScreen extends StatelessWidget {
  final ActiveRide ride;
  final bool isBusy;
  final VoidCallback onMarkArriving;
  final VoidCallback onStart;
  final VoidCallback onComplete;
  final VoidCallback onCancel;

  const ActiveRideScreen({
    super.key,
    required this.ride,
    required this.isBusy,
    required this.onMarkArriving,
    required this.onStart,
    required this.onComplete,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(_titleFor(ride.status)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _AddressRow(icon: Icons.trip_origin, color: AppColors.primary, label: ride.pickupAddress ?? 'Pickup location'),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                      child: SizedBox(height: 16, width: 1, child: VerticalDivider(color: AppColors.border)),
                    ),
                    _AddressRow(icon: Icons.location_on, color: AppColors.error, label: ride.dropAddress ?? 'Drop location'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  if (ride.distanceKm != null)
                    Expanded(child: _StatCard(label: 'Distance', value: '${ride.distanceKm!.toStringAsFixed(1)} km')),
                  if (ride.distanceKm != null) const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Fare',
                      value: _fareLabel(ride),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              if (ride.status != 'started')
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: isBusy ? null : onCancel,
                    style: TextButton.styleFrom(foregroundColor: AppColors.error),
                    child: const Text('Cancel ride'),
                  ),
                ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isBusy ? null : _primaryActionFor(ride.status),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: isBusy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(_primaryLabelFor(ride.status)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _fareLabel(ActiveRide ride) {
    final minor = ride.finalFareMinor ?? ride.estimatedFareMinor;
    if (minor == null) return '—';
    final major = minor / 100;
    final currency = ride.currencyCode ?? '';
    return '$currency ${major.toStringAsFixed(2)}';
  }

  String _titleFor(String status) {
    switch (status) {
      case 'accepted':
        return 'Heading to pickup';
      case 'arriving':
        return 'Arrived at pickup';
      case 'started':
        return 'Trip in progress';
      default:
        return 'Current ride';
    }
  }

  String _primaryLabelFor(String status) {
    switch (status) {
      case 'accepted':
        return "I've Arrived";
      case 'arriving':
        return 'Start Trip';
      case 'started':
        return 'Complete Trip';
      default:
        return 'Continue';
    }
  }

  VoidCallback _primaryActionFor(String status) {
    switch (status) {
      case 'accepted':
        return onMarkArriving;
      case 'arriving':
        return onStart;
      case 'started':
        return onComplete;
      default:
        return onStart;
    }
  }
}

class _AddressRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  const _AddressRow({required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }
}
