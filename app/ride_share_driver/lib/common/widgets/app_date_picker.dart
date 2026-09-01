import 'package:calendar_date_picker2/calendar_date_picker2.dart';
import 'package:flutter/material.dart';
import '../../style/appcolors.dart';

class AppDatePicker {
  AppDatePicker._();

  /// Opens a calendar date picker in dialog mode for single date selection.
  ///
  /// Returns the selected [DateTime] or null if canceled.
  static Future<DateTime?> showCustomDatePicker({
    required BuildContext context,
    DateTime? initialDate,
    DateTime? firstDate,
    DateTime? lastDate,
    Color? primaryColor,
  }) async {
    final effectivePrimary = primaryColor ?? AppColors.primary;
    final initial = initialDate ?? DateTime.now();
    final first = firstDate ?? DateTime(1940);
    final last = lastDate ?? DateTime(2100);

    final config = CalendarDatePicker2WithActionButtonsConfig(
      calendarType: CalendarDatePicker2Type.single,
      selectedDayHighlightColor: effectivePrimary,
      selectedDayTextStyle: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
      ),
      todayTextStyle: TextStyle(
        color: effectivePrimary,
        fontWeight: FontWeight.bold,
      ),
      firstDate: first,
      lastDate: last,
      currentDate: DateTime.now(),
      controlsTextStyle: const TextStyle(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.bold,
        fontSize: 15,
      ),
      weekdayLabelTextStyle: const TextStyle(
        color: AppColors.textSecondary,
        fontWeight: FontWeight.w600,
        fontSize: 13,
      ),
      dayTextStyle: const TextStyle(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.w500,
        fontSize: 14,
      ),
      disabledDayTextStyle: TextStyle(
        color: Colors.grey.shade400,
        fontSize: 14,
      ),
      cancelButtonTextStyle: const TextStyle(
        color: AppColors.textSecondary,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      ),
      okButtonTextStyle: TextStyle(
        color: effectivePrimary,
        fontWeight: FontWeight.bold,
        fontSize: 14,
      ),
      dayBorderRadius: BorderRadius.circular(10),
      yearTextStyle: const TextStyle(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.w600,
      ),
      selectedYearTextStyle: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
      ),
    );

    final results = await showCalendarDatePicker2Dialog(
      context: context,
      config: config,
      dialogSize: const Size(340, 390),
      borderRadius: BorderRadius.circular(20),
      value: [initial],
      dialogBackgroundColor: Colors.white,
    );

    if (results != null && results.isNotEmpty && results.first != null) {
      return results.first;
    }
    return null;
  }

  /// Opens a calendar date picker in dialog mode for date range selection.
  ///
  /// Returns a [List<DateTime?>] containing start and end dates or null.
  static Future<List<DateTime?>?> showCustomDateRangePicker({
    required BuildContext context,
    List<DateTime?>? initialRange,
    DateTime? firstDate,
    DateTime? lastDate,
    Color? primaryColor,
  }) async {
    final effectivePrimary = primaryColor ?? AppColors.primary;
    final first = firstDate ?? DateTime(2020);
    final last = lastDate ?? DateTime(2100);

    final config = CalendarDatePicker2WithActionButtonsConfig(
      calendarType: CalendarDatePicker2Type.range,
      selectedDayHighlightColor: effectivePrimary,
      selectedDayTextStyle: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
      ),
      selectedRangeHighlightColor: effectivePrimary.withOpacity(0.15),
      selectedRangeDayTextStyle: TextStyle(
        color: effectivePrimary,
        fontWeight: FontWeight.bold,
      ),
      todayTextStyle: TextStyle(
        color: effectivePrimary,
        fontWeight: FontWeight.bold,
      ),
      firstDate: first,
      lastDate: last,
      currentDate: DateTime.now(),
      controlsTextStyle: const TextStyle(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.bold,
        fontSize: 15,
      ),
      weekdayLabelTextStyle: const TextStyle(
        color: AppColors.textSecondary,
        fontWeight: FontWeight.w600,
        fontSize: 13,
      ),
      dayTextStyle: const TextStyle(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.w500,
        fontSize: 14,
      ),
      cancelButtonTextStyle: const TextStyle(
        color: AppColors.textSecondary,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      ),
      okButtonTextStyle: TextStyle(
        color: effectivePrimary,
        fontWeight: FontWeight.bold,
        fontSize: 14,
      ),
      dayBorderRadius: BorderRadius.circular(10),
    );

    final results = await showCalendarDatePicker2Dialog(
      context: context,
      config: config,
      dialogSize: const Size(340, 400),
      borderRadius: BorderRadius.circular(20),
      value: initialRange ?? [],
      dialogBackgroundColor: Colors.white,
    );

    return results;
  }
}
