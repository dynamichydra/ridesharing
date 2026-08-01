import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppColors {
  // Common Colors
  static const Color primaryBlue = Color(0xFF01A34D); // Green (#01a34d) as primary brand color
  static const Color secondaryBlue = Color(0xFF0165B7); // Blue (#0165b7) as secondary brand color
  static const Color successGreen = Color(0xFF01A34D); // Green Accent
  static const Color warningOrange = Color(0xFFFFC800); // Yellow/Orange
  static const Color errorRed = Color(0xFFE53935); // Danger Red

  // Light Theme Colors
  static const Color lightPrimary = Color(0xFF0F0F10);
  static const Color lightBackground = Color(0xFFF6F6F9);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightTextPrimary = Color(0xFF000000);
  static const Color lightTextSecondary = Color(0xFF6B6B76);
  static const Color lightDivider = Color(0xFFEEEEF2);

  // Dark Theme Colors
  static const Color darkPrimary = Color(0xFFFFFFFF);
  static const Color darkBackground = Color(0xFF121214);
  static const Color darkSurface = Color(0xFF1E1E22);
  static const Color darkTextPrimary = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFF9E9EAE);
  static const Color darkDivider = Color(0xFF2D2D34);
}

class AppSpacing {
  static const double xs = 4.0;
  static const double s = 8.0;
  static const double m = 16.0;
  static const double l = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}

class AppRadius {
  static const double s = 4.0;
  static const double m = 8.0;
  static const double l = 16.0;
  static const double xl = 24.0;
  static const double rounded = 999.0;
}

class AppMockAssets {
  static const String users = 'assets/mock/users.json';
  static const String rides = 'assets/mock/rides.json';
  static const String rideHistory = 'assets/mock/ride_history.json';
  static const String notifications = 'assets/mock/notifications.json';
  static const String wallet = 'assets/mock/wallet.json';
  static const String vehicles = 'assets/mock/vehicles.json';
}

class CountryConfig {
  final String name;
  final String isoCode;
  final String dialCode;
  final String currencySymbol;
  final String currencyCode;
  final String distanceUnit;

  const CountryConfig({
    required this.name,
    required this.isoCode,
    required this.dialCode,
    required this.currencySymbol,
    required this.currencyCode,
    this.distanceUnit = 'km',
  });

  static const List<CountryConfig> supportedCountries = [
    CountryConfig(name: 'Argentina', isoCode: 'AR', dialCode: '+54', currencySymbol: '\$', currencyCode: 'ARS'),
    CountryConfig(name: 'Australia', isoCode: 'AU', dialCode: '+61', currencySymbol: '\$', currencyCode: 'AUD'),
    CountryConfig(name: 'Bangladesh', isoCode: 'BD', dialCode: '+880', currencySymbol: '৳', currencyCode: 'BDT'),
    CountryConfig(name: 'Brazil', isoCode: 'BR', dialCode: '+55', currencySymbol: 'R\$', currencyCode: 'BRL'),
    CountryConfig(name: 'Canada', isoCode: 'CA', dialCode: '+1', currencySymbol: '\$', currencyCode: 'CAD'),
    CountryConfig(name: 'China', isoCode: 'CN', dialCode: '+86', currencySymbol: '¥', currencyCode: 'CNY'),
    CountryConfig(name: 'Egypt', isoCode: 'EG', dialCode: '+20', currencySymbol: 'E£', currencyCode: 'EGP'),
    CountryConfig(name: 'France', isoCode: 'FR', dialCode: '+33', currencySymbol: '€', currencyCode: 'EUR'),
    CountryConfig(name: 'Germany', isoCode: 'DE', dialCode: '+49', currencySymbol: '€', currencyCode: 'EUR'),
    CountryConfig(name: 'India', isoCode: 'IN', dialCode: '+91', currencySymbol: '₹', currencyCode: 'INR'),
    CountryConfig(name: 'Indonesia', isoCode: 'ID', dialCode: '+62', currencySymbol: 'Rp', currencyCode: 'IDR'),
    CountryConfig(name: 'Italy', isoCode: 'IT', dialCode: '+39', currencySymbol: '€', currencyCode: 'EUR'),
    CountryConfig(name: 'Japan', isoCode: 'JP', dialCode: '+81', currencySymbol: '¥', currencyCode: 'JPY'),
    CountryConfig(name: 'Kenya', isoCode: 'KE', dialCode: '+254', currencySymbol: 'KSh', currencyCode: 'KES'),
    CountryConfig(name: 'Malaysia', isoCode: 'MY', dialCode: '+60', currencySymbol: 'RM', currencyCode: 'MYR'),
    CountryConfig(name: 'Mexico', isoCode: 'MX', dialCode: '+52', currencySymbol: '\$', currencyCode: 'MXN'),
    CountryConfig(name: 'Nepal', isoCode: 'NP', dialCode: '+977', currencySymbol: 'Rs', currencyCode: 'NPR'),
    CountryConfig(name: 'Netherlands', isoCode: 'NL', dialCode: '+31', currencySymbol: '€', currencyCode: 'EUR'),
    CountryConfig(name: 'New Zealand', isoCode: 'NZ', dialCode: '+64', currencySymbol: 'NZ\$', currencyCode: 'NZD'),
    CountryConfig(name: 'Nigeria', isoCode: 'NG', dialCode: '+234', currencySymbol: '₦', currencyCode: 'NGN'),
    CountryConfig(name: 'Pakistan', isoCode: 'PK', dialCode: '+92', currencySymbol: 'Rs', currencyCode: 'PKR'),
    CountryConfig(name: 'Philippines', isoCode: 'PH', dialCode: '+63', currencySymbol: '₱', currencyCode: 'PHP'),
    CountryConfig(name: 'Saudi Arabia', isoCode: 'SA', dialCode: '+966', currencySymbol: 'SR', currencyCode: 'SAR'),
    CountryConfig(name: 'Singapore', isoCode: 'SG', dialCode: '+65', currencySymbol: 'S\$', currencyCode: 'SGD'),
    CountryConfig(name: 'South Africa', isoCode: 'ZA', dialCode: '+27', currencySymbol: 'R', currencyCode: 'ZAR'),
    CountryConfig(name: 'South Korea', isoCode: 'KR', dialCode: '+82', currencySymbol: '₩', currencyCode: 'KRW'),
    CountryConfig(name: 'Spain', isoCode: 'ES', dialCode: '+34', currencySymbol: '€', currencyCode: 'EUR'),
    CountryConfig(name: 'Sri Lanka', isoCode: 'LK', dialCode: '+94', currencySymbol: 'Rs', currencyCode: 'LKR'),
    CountryConfig(name: 'Switzerland', isoCode: 'CH', dialCode: '+41', currencySymbol: 'CHF', currencyCode: 'CHF'),
    CountryConfig(name: 'Thailand', isoCode: 'TH', dialCode: '+66', currencySymbol: '฿', currencyCode: 'THB'),
    CountryConfig(name: 'Turkey', isoCode: 'TR', dialCode: '+90', currencySymbol: '₺', currencyCode: 'TRY'),
    CountryConfig(name: 'United Arab Emirates', isoCode: 'AE', dialCode: '+971', currencySymbol: 'AED', currencyCode: 'AED'),
    CountryConfig(name: 'United Kingdom', isoCode: 'GB', dialCode: '+44', currencySymbol: '£', currencyCode: 'GBP'),
    CountryConfig(name: 'United States', isoCode: 'US', dialCode: '+1', currencySymbol: '\$', currencyCode: 'USD'),
    CountryConfig(name: 'Vietnam', isoCode: 'VN', dialCode: '+84', currencySymbol: '₫', currencyCode: 'VND'),
  ];
}

class AppConstants {
  static String currencySymbol = '₹';
  static const String distanceUnit = 'km';
  static const String googleMapsApiKey = 'AIzaSyCa9c3EMWliRd2AUcZA-LpJF7VwhEjsd7g';

  // Google Cloud Map IDs
  static const String androidMapId = 'fff6d11d7fdc289b41602fe8';
  static const String iosMapId = 'fff6d11d7fdc289b1acc6a66';

  /// Automatically resolves the correct Google Cloud Map ID based on platform
  static String get cloudMapId {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return iosMapId;
    }
    return androidMapId;
  }
}

