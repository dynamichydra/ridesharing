import 'package:flutter/material.dart';

class Style {
  final ThemeData theme = ThemeData(
    useMaterial3: true,

    // Brand Colors
    primaryColor: const Color(0xFF08B24E),

    colorScheme: const ColorScheme.light(
      primary: Color(0xFF08B24E),
      secondary: Color(0xFF0D6FD1),
      tertiary: Color(0xFFFFC800),
      surface: Color(0xFFF6F8FA),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: Color(0xFF212121),
    ),

    scaffoldBackgroundColor: Colors.white,

    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.white,
      foregroundColor: Color(0xFF212121),
      surfaceTintColor: Colors.transparent,
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: Color(0xFF08B24E),
      unselectedItemColor: Colors.grey,
      type: BottomNavigationBarType.fixed,
      elevation: 10,
    ),

    cardTheme: CardThemeData(
      color: const Color(0xFFF6F8FA),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
    ),

    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        color: Color(0xFF212121),
        fontWeight: FontWeight.bold,
      ),
      headlineMedium: TextStyle(
        color: Color(0xFF212121),
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: TextStyle(
        color: Color(0xFF212121),
      ),
      bodyMedium: TextStyle(
        color: Color(0xFF424242),
      ),
      bodySmall: TextStyle(
        color: Color(0xFF757575),
      ),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF08B24E),
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF08B24E),
        side: const BorderSide(
          color: Color(0xFF08B24E),
        ),
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: const Color(0xFF0D6FD1),
      ),
    ),

    radioTheme: const RadioThemeData(
      fillColor: WidgetStatePropertyAll(
        Color(0xFF08B24E),
      ),
    ),

    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const Color(0xFF08B24E);
        }
        return Colors.transparent;
      }),
      checkColor: const WidgetStatePropertyAll(
        Colors.white,
      ),
      side: const BorderSide(
        color: Color(0xFF08B24E),
      ),
    ),

    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const Color(0xFF08B24E);
        }
        return Colors.grey.shade400;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const Color(0x3308B24E);
        }
        return Colors.grey.shade300;
      }),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 16,
      ),
      floatingLabelStyle: const TextStyle(
        color: Color(0xFF08B24E),
      ),
      hintStyle: TextStyle(
        color: Colors.grey.shade500,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(
          color: Color(0xFFE0E0E0),
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(
          color: Color(0xFFE0E0E0),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(
          color: Color(0xFF08B24E),
          width: 2,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(
          color: Colors.red,
        ),
      ),
    ),

    scrollbarTheme: ScrollbarThemeData(
      thumbColor: WidgetStateProperty.all(
        const Color(0xFF08B24E),
      ),
      radius: const Radius.circular(20),
    ),

    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: Color(0xFF08B24E),
      selectionHandleColor: Color(0xFF08B24E),
      selectionColor: Color(0x3308B24E),
    ),

    chipTheme: ChipThemeData(
      selectedColor: const Color(0xFF08B24E),
      backgroundColor: Colors.grey.shade100,
      checkmarkColor: Colors.white,
      labelStyle: const TextStyle(
        color: Color(0xFF212121),
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(30),
      ),
    ),

    dividerColor: const Color(0xFFE8E8E8),

    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: Color(0xFF08B24E),
    ),

    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: Color(0xFF08B24E),
      foregroundColor: Colors.white,
    ),
  );
}