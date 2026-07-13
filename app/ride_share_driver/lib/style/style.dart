import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class Style {
  final ThemeData theme = ThemeData(
    useMaterial3: true,
    fontFamily: GoogleFonts.outfit().fontFamily,

    // Brand Colors
    primaryColor: const Color(0xFF01A34D),

    colorScheme: const ColorScheme.light(
      primary: Color(0xFF01A34D),
      secondary: Color(0xFF0165B7),
      tertiary: Color(0xFFFFC800),
      surface: Color(0xFFF9FAFB),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: Color(0xFF1F2937),
    ),

    scaffoldBackgroundColor: Colors.white,

    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.white,
      foregroundColor: Color(0xFF1F2937),
      surfaceTintColor: Colors.transparent,
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: Color(0xFF01A34D),
      unselectedItemColor: Colors.grey,
      type: BottomNavigationBarType.fixed,
      elevation: 10,
    ),

    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade100, width: 1),
      ),
    ),

    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        color: Color(0xFF1F2937),
        fontWeight: FontWeight.bold,
      ),
      headlineMedium: TextStyle(
        color: Color(0xFF1F2937),
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: TextStyle(
        color: Color(0xFF1F2937),
      ),
      bodyMedium: TextStyle(
        color: Color(0xFF4B5563),
      ),
      bodySmall: TextStyle(
        color: Color(0xFF6B7280),
      ),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF01A34D),
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 54),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF01A34D),
        side: const BorderSide(
          color: Color(0xFF01A34D),
          width: 1.5,
        ),
        minimumSize: const Size(double.infinity, 54),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: const Color(0xFF0165B7),
      ),
    ),

    radioTheme: const RadioThemeData(
      fillColor: WidgetStatePropertyAll(
        Color(0xFF01A34D),
      ),
    ),

    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const Color(0xFF01A34D);
        }
        return Colors.transparent;
      }),
      checkColor: const WidgetStatePropertyAll(
        Colors.white,
      ),
      side: const BorderSide(
        color: Color(0xFF01A34D),
        width: 1.5,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(4),
      ),
    ),

    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const Color(0xFF01A34D);
        }
        return Colors.grey.shade400;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const Color(0x3301A34D);
        }
        return Colors.grey.shade300;
      }),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 16,
      ),
      floatingLabelStyle: const TextStyle(
        color: Color(0xFF01A34D),
      ),
      hintStyle: TextStyle(
        color: Colors.grey.shade400,
        fontWeight: FontWeight.normal,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: Colors.grey.shade200,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: Colors.grey.shade200,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(
          color: Color(0xFF0165B7),
          width: 2,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(
          color: Colors.red,
        ),
      ),
    ),

    scrollbarTheme: ScrollbarThemeData(
      thumbColor: WidgetStateProperty.all(
        const Color(0xFF01A34D),
      ),
      radius: const Radius.circular(20),
    ),

    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: Color(0xFF01A34D),
      selectionHandleColor: Color(0xFF01A34D),
      selectionColor: Color(0x3301A34D),
    ),

    chipTheme: ChipThemeData(
      selectedColor: const Color(0xFF01A34D),
      backgroundColor: const Color(0xFFF3F4F6),
      checkmarkColor: Colors.white,
      labelStyle: const TextStyle(
        color: Color(0xFF1F2937),
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(30),
      ),
    ),

    dividerColor: const Color(0xFFE5E7EB),

    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: Color(0xFF01A34D),
    ),

    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: Color(0xFF01A34D),
      foregroundColor: Colors.white,
    ),
  );
}