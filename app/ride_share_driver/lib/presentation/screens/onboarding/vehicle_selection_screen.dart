import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';

class VehicleSelectionScreen extends StatelessWidget {
  final VoidCallback onHasVehicle;
  final VoidCallback onNeedVehicle;

  const VehicleSelectionScreen({
    super.key,
    required this.onHasVehicle,
    required this.onNeedVehicle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Vehicle Options',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Select how you want to set up your taxi partner vehicle.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 40),
          Expanded(
            child: ListView(
              children: [
                _buildCard(
                  context,
                  title: 'I have my own vehicle',
                  subtitle: 'Register your personal cab, auto-rickshaw or motor bike. Minimum requirement: 2019 model or newer.',
                  icon: Icons.directions_car_rounded,
                  color: AppColors.primary,
                  onTap: () {
                    debugPrint('[VehicleSelectionScreen] I have my own vehicle clicked');
                    onHasVehicle();
                  },
                ),
                const SizedBox(height: 24),
                _buildCard(
                  context,
                  title: 'I need a vehicle rental',
                  subtitle: 'Request a customized lease vehicle. Lyft Express Rent option with maintenance and insurance is coming soon.',
                  icon: Icons.car_rental_rounded,
                  color: AppColors.secondary,
                  onTap: () {
                    debugPrint('[VehicleSelectionScreen] I need a vehicle rental clicked');
                    onNeedVehicle();
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 36, color: color),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.45),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  'Select Option',
                  style: TextStyle(fontWeight: FontWeight.bold, color: color),
                ),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward_rounded, size: 16, color: color),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
