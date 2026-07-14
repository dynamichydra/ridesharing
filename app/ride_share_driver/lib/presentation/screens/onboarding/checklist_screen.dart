import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/repositories/onboarding_repository.dart';

class ChecklistScreen extends StatelessWidget {
  final RegistrationSummary summary;
  final Function(String itemCode) onItemTap;
  final VoidCallback onSubmit;

  const ChecklistScreen({
    super.key,
    required this.summary,
    required this.onItemTap,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    // 9 standard todo items matching Lyft Driver flow
    final todoItems = [
      _ChecklistItem(
        code: 'personal_info',
        title: 'Personal Info',
        description: 'First, last name and date of birth details',
        icon: Icons.person_rounded,
        isCompleted:
            summary.driver.name != null && summary.driver.name!.isNotEmpty,
      ),
      _ChecklistItem(
        code: 'drivingLocation',
        title: 'Driving Region',
        description: 'Country, State and City limits',
        icon: Icons.location_on_rounded,
        isCompleted: summary.driver.cityId != null,
      ),
      _ChecklistItem(
        code: 'legalAcceptance',
        title: 'Terms of Service',
        description: 'Lyft partner legal agreement policy',
        icon: Icons.description_rounded,
        isCompleted: !summary.missing.contains('legalAcceptance'),
      ),
      _ChecklistItem(
        code: 'vehicle',
        title: 'Car details',
        description: 'Add make, model, year and license plate',
        icon: Icons.directions_car_rounded,
        isCompleted: summary.vehicles.isNotEmpty,
      ),
      _ChecklistItem(
        code: 'document:DRIVERS_LICENSE',
        title: 'Driver\'s licence',
        description: 'Identity validation and DL proof',
        icon: Icons.badge_rounded,
        isCompleted: !summary.missing.contains('document:DRIVERS_LICENSE'),
      ),
      _ChecklistItem(
        code: 'document:NATIONAL_ID',
        title: 'Aadhar Card (National ID)',
        description: 'Aadhar card validation proof',
        icon: Icons.style_rounded,
        isCompleted: !summary.missing.contains('document:NATIONAL_ID'),
      ),
      _ChecklistItem(
        code: 'profile_photo',
        title: 'Profile photo',
        description: 'Clear image so passengers know who you are',
        icon: Icons.camera_alt_rounded,
        isCompleted:
            summary.driver.profilePhoto != null &&
            summary.driver.profilePhoto!.isNotEmpty,
      ),
      _ChecklistItem(
        code: 'bank_details',
        title: 'Direct deposit info',
        description: 'Payout details (account number, IFSC code)',
        icon: Icons.account_balance_rounded,
        isCompleted: !summary.missing.contains('bank_details'),
      ),
      _ChecklistItem(
        code: 'emergency_contact',
        title: 'Emergency contact',
        description: 'Relative/companion safety phone details',
        icon: Icons.contact_phone_rounded,
        isCompleted: !summary.missing.contains('emergency_contact'),
      ),
    ];

    final completedCount = todoItems.where((i) => i.isCompleted).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: Row(
            children: [
              const Text(
                'To-do',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  '$completedCount / 9 items',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            itemCount: todoItems.length,
            itemBuilder: (context, index) {
              final item = todoItems[index];
              return Card(
                color: Colors.white,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 8,
                    horizontal: 16,
                  ),
                  leading: CircleAvatar(
                    backgroundColor: item.isCompleted
                        ? AppColors.primary.withOpacity(0.1)
                        : AppColors.surface,
                    child: Icon(
                      item.icon,
                      color: item.isCompleted
                          ? AppColors.primary
                          : AppColors.textSecondary,
                    ),
                  ),
                  title: Text(
                    item.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    item.description,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  trailing: Icon(
                    item.isCompleted
                        ? Icons.check_circle_rounded
                        : Icons.chevron_right_rounded,
                    color: item.isCompleted
                        ? AppColors.primary
                        : AppColors.border,
                  ),
                  onTap: () => onItemTap(item.code),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: ElevatedButton(
            onPressed: completedCount >= 9 ? onSubmit : null,
            child: const Text('Submit Application'),
          ),
        ),
      ],
    );
  }
}

class _ChecklistItem {
  final String code;
  final String title;
  final String description;
  final IconData icon;
  final bool isCompleted;

  _ChecklistItem({
    required this.code,
    required this.title,
    required this.description,
    required this.icon,
    required this.isCompleted,
  });
}
