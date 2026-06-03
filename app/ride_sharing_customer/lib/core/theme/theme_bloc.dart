import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../services/storage_service.dart';

abstract class ThemeEvent {}

class ToggleTheme extends ThemeEvent {
  final bool isDark;
  ToggleTheme(this.isDark);
}

class ThemeState {
  final ThemeMode themeMode;
  ThemeState(this.themeMode);
}

class ThemeBloc extends Bloc<ThemeEvent, ThemeState> {
  final StorageService _storageService;

  ThemeBloc(this._storageService)
      : super(ThemeState(_storageService.isDarkMode() ? ThemeMode.dark : ThemeMode.light)) {
    on<ToggleTheme>((event, emit) async {
      await _storageService.setDarkMode(event.isDark);
      emit(ThemeState(event.isDark ? ThemeMode.dark : ThemeMode.light));
    });
  }
}
