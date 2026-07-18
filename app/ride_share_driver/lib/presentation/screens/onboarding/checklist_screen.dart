import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/repositories/onboarding_repository.dart';
import '../../../domain/entities/document.dart';

class ChecklistScreen extends StatelessWidget {
  final RegistrationSummary summary;
  final bool needsVehicleRental;
  final List<DocumentType> documentRequirements;
  final Function(String itemCode) onItemTap;
  final VoidCallback onSubmit;

  const ChecklistScreen({
    super.key,
    required this.summary,
    this.needsVehicleRental = false,
    required this.documentRequirements,
    required this.onItemTap,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    bool isDocumentComplete(String docCode) {
      DocumentType? docReq;
      for (final req in documentRequirements) {
        if (req.code == docCode) {
          docReq = req;
          break;
        }
      }
      if (docReq == null) return false;

      DriverDocument? doc;
      for (final d in summary.documents) {
        if (d.documentTypeId == docReq.id) {
          doc = d;
          break;
        }
      }
      if (doc == null) return false;

      if (docReq.requiresFront &&
          (doc.frontUrl == null || doc.frontUrl!.isEmpty)) {
        return false;
      }
      if (docReq.requiresBack &&
          (doc.backUrl == null || doc.backUrl!.isEmpty)) {
        return false;
      }
      if (docReq.requiresPdf && (doc.pdfUrl == null || doc.pdfUrl!.isEmpty)) {
        return false;
      }
      return true;
    }

    // 9 standard todo items matching Ryva Ride Driver flow
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
        description: 'Ryva Ride partner legal agreement policy',
        icon: Icons.description_rounded,
        isCompleted: !summary.missing.contains('legalAcceptance'),
      ),
      _ChecklistItem(
        code: 'questionnaire',
        title: 'Survey Questions',
        description: 'Complete driver profile questionnaire',
        icon: Icons.question_answer_rounded,
        isCompleted: !summary.missing.any(
          (item) => item.startsWith('question:'),
        ),
      ),
      _ChecklistItem(
        code: 'vehicle',
        title: 'Car details',
        description: 'Add make, model, year and license plate',
        icon: Icons.directions_car_rounded,
        isCompleted: needsVehicleRental || summary.vehicles.isNotEmpty,
      ),
    ];

    // Add required document list dynamically from documentRequirements
    for (final req in documentRequirements) {
      if (req.code == 'DRIVERS_LICENSE') {
        todoItems.add(
          _ChecklistItem(
            code: 'document:DRIVERS_LICENSE',
            title: 'Driver\'s licence',
            description: 'Identity validation and DL proof',
            icon: Icons.badge_rounded,
            isCompleted: isDocumentComplete('DRIVERS_LICENSE'),
          ),
        );
      } else if (req.code == 'NATIONAL_ID') {
        todoItems.add(
          _ChecklistItem(
            code: 'document:NATIONAL_ID',
            title: 'Aadhar Card (National ID)',
            description: 'Aadhar card validation proof',
            icon: Icons.style_rounded,
            isCompleted: isDocumentComplete('NATIONAL_ID'),
          ),
        );
      } else if (req.code == 'VEHICLE_REGISTRATION' && !needsVehicleRental) {
        todoItems.add(
          _ChecklistItem(
            code: 'document:VEHICLE_REGISTRATION',
            title: 'Vehicle Registration',
            description: 'Upload RC Book front side',
            icon: Icons.assignment_rounded,
            isCompleted: isDocumentComplete('VEHICLE_REGISTRATION'),
          ),
        );
      } else if (req.code == 'INSURANCE_CERTIFICATE' && !needsVehicleRental) {
        todoItems.add(
          _ChecklistItem(
            code: 'document:INSURANCE_CERTIFICATE',
            title: 'Insurance Certificate',
            description: 'Upload valid insurance policy paper',
            icon: Icons.security_rounded,
            isCompleted: isDocumentComplete('INSURANCE_CERTIFICATE'),
          ),
        );
      }
    }

    // Add remaining items
    todoItems.addAll([
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
    ]);

    final completedCount = todoItems.where((i) => i.isCompleted).length;
    final totalCount = todoItems.length;
    // We allow skipping Bank Details and Emergency Contact (2 items)
    final isButtonEnabled = completedCount >= (totalCount - 2);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'To-do',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.secondary.withOpacity(0.2),
                  ),
                ),
                child: Text(
                  '$completedCount / $totalCount items',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: AppColors.secondary,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            physics: const BouncingScrollPhysics(),
            itemCount: todoItems.length,
            itemBuilder: (context, index) {
              final item = todoItems[index];
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: item.isCompleted
                        ? AppColors.primary.withOpacity(0.4)
                        : AppColors.border,
                    width: item.isCompleted ? 1.5 : 1.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: item.isCompleted
                          ? AppColors.primary.withOpacity(0.02)
                          : Colors.black.withOpacity(0.01),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 6,
                    horizontal: 16,
                  ),
                  leading: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: item.isCompleted
                          ? AppColors.secondary.withOpacity(0.08)
                          : AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      item.icon,
                      color: item.isCompleted
                          ? AppColors.secondary
                          : AppColors.textSecondary,
                      size: 22,
                    ),
                  ),
                  title: Text(
                    item.title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: item.isCompleted
                          ? AppColors.textPrimary
                          : AppColors.textPrimary.withOpacity(0.8),
                    ),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4.0),
                    child: Text(
                      item.description,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.3,
                      ),
                    ),
                  ),
                  trailing: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: item.isCompleted
                          ? AppColors.primary
                          : AppColors.surface,
                      border: Border.all(
                        color: item.isCompleted
                            ? AppColors.primary
                            : AppColors.border,
                        width: 1.5,
                      ),
                    ),
                    child: Icon(
                      item.isCompleted
                          ? Icons.check
                          : Icons.chevron_right_rounded,
                      size: 16,
                      color: item.isCompleted
                          ? Colors.white
                          : AppColors.textSecondary,
                    ),
                  ),
                  onTap: () => onItemTap(item.code),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: isButtonEnabled ? 1.0 : 0.6,
            child: SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: isButtonEnabled ? onSubmit : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.textSecondary.withOpacity(
                    0.2,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: isButtonEnabled ? 2 : 0,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Submit Application',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(width: 8),
                    Icon(Icons.send_rounded, size: 18),
                  ],
                ),
              ),
            ),
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
