import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../common/widgets/custom_toast.dart';
import 'widgets/three_dots_loader.dart';

class VehicleSelectionScreen extends StatefulWidget {
  final VoidCallback onHasVehicle;
  final VoidCallback onNeedVehicle;
  final bool isLoading;

  const VehicleSelectionScreen({
    super.key,
    required this.onHasVehicle,
    required this.onNeedVehicle,
    this.isLoading = false,
  });

  @override
  State<VehicleSelectionScreen> createState() => _VehicleSelectionScreenState();
}

class _VehicleSelectionScreenState extends State<VehicleSelectionScreen> {
  int? _selectedOptionIndex; // 0 = own vehicle

  void _handleContinue() {
    if (_selectedOptionIndex == 0) {
      widget.onHasVehicle();
    }
  }

  void _onRentalOptionTapped() {
    CustomToast.show(
      context,
      'Rental services are not available right now. Please register with your own vehicle.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasSelection = _selectedOptionIndex == 0;

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Vehicle Options',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Select how you want to set up your taxi partner vehicle.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              children: [
                _buildSelectableCard(
                  index: 0,
                  title: 'I have my own vehicle',
                  subtitle:
                      'Register your personal cab, auto-rickshaw or motor bike. Minimum requirement: 2019 model or newer.',
                  icon: Icons.directions_car_rounded,
                  color: AppColors.primary,
                  isAvailable: true,
                ),
                const SizedBox(height: 20),
                _buildSelectableCard(
                  index: 1,
                  title: 'I need a vehicle rental',
                  subtitle:
                      'Rental services are currently unavailable in your region. Please register your own vehicle.',
                  icon: Icons.car_rental_rounded,
                  color: AppColors.textSecondary,
                  isAvailable: false,
                  onDisabledTap: _onRentalOptionTapped,
                ),
              ],
            ),
          ),

          // Continue Button
          AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: hasSelection ? 1.0 : 0.6,
            child: Container(
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: hasSelection
                    ? AppColors.primary
                    : AppColors.textSecondary.withOpacity(0.3),
                boxShadow: hasSelection
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.25),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: ElevatedButton(
                onPressed: (hasSelection && !widget.isLoading) ? _handleContinue : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: widget.isLoading
                    ? const ThreeDotsLoader()
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Continue',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: hasSelection
                                  ? Colors.white
                                  : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.arrow_forward_rounded,
                            color: hasSelection
                                ? Colors.white
                                : AppColors.textSecondary,
                            size: 20,
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectableCard({
    required int index,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    bool isAvailable = true,
    VoidCallback? onDisabledTap,
  }) {
    final isSelected = isAvailable && _selectedOptionIndex == index;

    return GestureDetector(
      onTap: () {
        if (!isAvailable) {
          onDisabledTap?.call();
          return;
        }
        debugPrint('[VehicleSelectionScreen] Option $index clicked');
        setState(() {
          _selectedOptionIndex = index;
        });
      },
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: isAvailable ? 1.0 : 0.65,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isAvailable ? Colors.white : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? color
                  : (isAvailable ? AppColors.border : const Color(0xFFE2E8F0)),
              width: isSelected ? 2.5 : 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: isSelected
                    ? color.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.02),
                blurRadius: isSelected ? 20 : 12,
                offset: isSelected ? const Offset(0, 8) : const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isSelected
                      ? color.withValues(alpha: 0.12)
                      : (isAvailable
                          ? AppColors.surface
                          : const Color(0xFFEDF2F7)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  icon,
                  size: 28,
                  color: isSelected
                      ? color
                      : (isAvailable
                          ? AppColors.textSecondary
                          : const Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  title,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected
                                        ? color
                                        : (isAvailable
                                            ? AppColors.textPrimary
                                            : const Color(0xFF64748B)),
                                  ),
                                ),
                              ),
                              if (!isAvailable) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEE2E2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'Unavailable',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFDC2626),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected ? color : Colors.transparent,
                            border: Border.all(
                              color: isSelected
                                  ? color
                                  : (isAvailable
                                      ? AppColors.border
                                      : const Color(0xFFCBD5E1)),
                              width: 2,
                            ),
                          ),
                          child: isSelected
                              ? const Icon(
                                  Icons.check,
                                  size: 14,
                                  color: Colors.white,
                                )
                              : (!isAvailable
                                  ? const Icon(
                                      Icons.lock_outline_rounded,
                                      size: 12,
                                      color: Color(0xFF94A3B8),
                                    )
                                  : null),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 13,
                        color: isAvailable
                            ? AppColors.textSecondary
                            : const Color(0xFF94A3B8),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
