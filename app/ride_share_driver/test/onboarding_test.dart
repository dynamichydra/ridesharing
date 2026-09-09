import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ride_share_driver/domain/repositories/onboarding_repository.dart';
import 'package:ride_share_driver/domain/entities/vehicle_model.dart';
import 'package:ride_share_driver/common/entities/driver_profile.dart';
import 'package:ride_share_driver/presentation/bloc/onboarding/onboarding_bloc.dart';
import 'package:ride_share_driver/presentation/screens/onboarding/vehicle_selection_screen.dart';

void main() {
  group('Onboarding Models & Events', () {
    test('RegistrationSummary holds bankAccount map', () {
      final summary = RegistrationSummary(
        driver: const DriverProfile(
          id: 'driver-123',
          name: 'Rajesh Kumar',
          phone: '+919876543210',
          email: 'rajesh@example.com',
          registrationStatus: 'registration_in_progress',
          registrationStep: 2,
          subscriptionStatus: 'inactive',
          rating: 5.0,
        ),
        vehicles: [],
        documents: [],
        answers: [],
        isComplete: false,
        missing: ['document:DRIVERS_LICENSE'],
        bankAccount: {
          'accountHolderName': 'Rajesh Kumar',
          'bankName': 'HDFC Bank',
          'accountNumberLast4': '4321',
          'routingCode': 'HDFC0001234',
          'upiId': 'rajesh@okhdfcbank',
          'isVerified': true,
        },
      );

      expect(summary.bankAccount, isNotNull);
      expect(summary.bankAccount!['upiId'], equals('rajesh@okhdfcbank'));
      expect(summary.bankAccount!['accountNumberLast4'], equals('4321'));
      expect(summary.bankAccount!['isVerified'], isTrue);
    });

    test('SaveBankDetailsEvent supports both Bank Account and UPI details', () {
      final bankEvent = SaveBankDetailsEvent(
        holder: 'Rajesh Kumar',
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
      );
      expect(bankEvent.holder, equals('Rajesh Kumar'));
      expect(bankEvent.accountNumber, equals('123456789012'));
      expect(bankEvent.upiId, isNull);

      final upiEvent = SaveBankDetailsEvent(
        upiId: 'rajesh@upi',
      );
      expect(upiEvent.upiId, equals('rajesh@upi'));
      expect(upiEvent.accountNumber, isNull);
    });
  });

  group('VehicleSelectionScreen Widget Tests', () {
    testWidgets('Tapping rental option does not select it or trigger continue', (tester) async {
      bool hasVehicleCalled = false;
      bool needVehicleCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VehicleSelectionScreen(
              onHasVehicle: () => hasVehicleCalled = true,
              onNeedVehicle: () => needVehicleCalled = true,
            ),
          ),
        ),
      );

      // Verify the cards are rendered
      expect(find.text('I have my own vehicle'), findsOneWidget);
      expect(find.text('I need a vehicle rental'), findsOneWidget);
      expect(find.text('Unavailable'), findsOneWidget);

      // Tap on rental option
      await tester.tap(find.text('I need a vehicle rental'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 4));

      // Continue button should still be disabled
      final continueButton = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(continueButton.onPressed, isNull);
      expect(needVehicleCalled, isFalse);

      // Now tap on own vehicle option
      await tester.tap(find.text('I have my own vehicle'));
      await tester.pumpAndSettle();

      // Continue button is now active
      final activeContinueButton = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(activeContinueButton.onPressed, isNotNull);

      // Tap Continue
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      expect(hasVehicleCalled, isTrue);
      expect(needVehicleCalled, isFalse);
    });
  });

  group('VehicleModel & Form Tests', () {
    test('VehicleModel json deserialization and displayName', () {
      final model = VehicleModel.fromJson({
        'id': 'vm-1',
        'vehicleTypeId': 'vt-cab',
        'brand': 'Maruti Suzuki',
        'name': 'Dzire',
        'slug': 'maruti-suzuki-dzire',
        'vehicleType': {
          'id': 'vt-cab',
          'name': 'Cab Economy',
          'slug': 'cab-economy',
          'capacity': 4,
        },
      });

      expect(model.id, equals('vm-1'));
      expect(model.displayName, equals('Maruti Suzuki Dzire'));
      expect(model.vehicleType?.name, equals('Cab Economy'));
    });
  });
}
