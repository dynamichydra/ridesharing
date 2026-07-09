import 'package:flutter/material.dart';
import 'style/style.dart';
import 'registration_wizard.dart';
import 'driver_dashboard.dart';
import 'api_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ApiService.init();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _isRegistered = false;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ride Sharing Driver',
      debugShowCheckedModeBanner: false,
      theme: Style().theme,
      home: _isRegistered
          ? DriverDashboard(
              onLogout: () {
                setState(() {
                  _isRegistered = false;
                });
              },
            )
          : RegistrationWizard(
              onComplete: () {
                setState(() {
                  _isRegistered = true;
                });
              },
            ),
    );
  }
}
