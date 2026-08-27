import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../common/entities/driver_profile.dart';
import '../../../../core/error/app_exception.dart';
import '../../../../services/app_logger.dart';
import '../../domain/repositories/auth_repository.dart';

// ── Events ──────────────────────────────────────────────────────────────────
abstract class AuthEvent {}

/// Fired once on app start to decide between a persisted session and the
/// login flow — deviceId is resolved internally by the data layer, never by
/// the UI, so it isn't a field here.
class CheckAuthStatus extends AuthEvent {}

class StartPhoneAuthentication extends AuthEvent {
  final String phone;
  final bool isLogin;
  StartPhoneAuthentication({required this.phone, required this.isLogin});
}

class VerifyOtpCode extends AuthEvent {
  final String phone;
  final String otp;
  final bool isLogin;
  VerifyOtpCode({
    required this.phone,
    required this.otp,
    required this.isLogin,
  });
}

class LogoutRequested extends AuthEvent {}

// ── States ──────────────────────────────────────────────────────────────────
abstract class AuthState {}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthOtpSent extends AuthState {}

class Authenticated extends AuthState {
  final DriverProfile driver;
  Authenticated({required this.driver});
}

class Unauthenticated extends AuthState {}

class AuthError extends AuthState {
  final String message;
  AuthError({required this.message});
}

// ── BLoC ───────────────────────────────────────────────────────────────────
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository authRepository;

  AuthBloc({required this.authRepository}) : super(AuthInitial()) {
    on<CheckAuthStatus>(_onCheckAuthStatus);
    on<StartPhoneAuthentication>(_onStartPhoneAuthentication);
    on<VerifyOtpCode>(_onVerifyOtpCode);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatus event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    final hasSession = await authRepository.hasStoredSession();
    if (!hasSession) {
      emit(Unauthenticated());
      return;
    }

    try {
      final driver = await authRepository.getCurrentDriver();
      emit(Authenticated(driver: driver));
    } on AppException catch (e) {
      AppLogger.i(
        '[AuthBloc] Stored session is no longer valid (${e.runtimeType}); clearing it.',
      );
      await authRepository.logout();
      emit(Unauthenticated());
    } catch (e) {
      AppLogger.e('[AuthBloc] Unexpected error restoring session', e);
      await authRepository.logout();
      emit(Unauthenticated());
    }
  }

  Future<void> _onStartPhoneAuthentication(
    StartPhoneAuthentication event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final result = await authRepository.startPhoneAuth(
        event.phone,
        event.isLogin,
      );
      if (!result.success) {
        emit(
          AuthError(
            message: result.error ?? 'Failed to request OTP. Try again.',
          ),
        );
        return;
      }
      if (!event.isLogin && !result.isNewAccount) {
        emit(AuthError(message: 'This phone number is already registered.'));
        return;
      }
      emit(AuthOtpSent());
    } catch (e) {
      emit(AuthError(message: e.toString()));
    }
  }

  Future<void> _onVerifyOtpCode(
    VerifyOtpCode event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final driver = await authRepository.verifyPhoneOtp(
        event.phone,
        event.otp,
        event.isLogin,
      );
      emit(Authenticated(driver: driver));
    } catch (e) {
      emit(AuthError(message: e.toString()));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      await authRepository.logout();
    } catch (e) {
      AppLogger.w(
        '[AuthBloc] Logout request failed, session was still cleared locally: $e',
      );
    }
    emit(Unauthenticated());
  }
}
