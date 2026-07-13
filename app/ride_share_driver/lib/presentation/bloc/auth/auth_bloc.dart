import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/driver.dart';
import '../../../domain/repositories/auth_repository.dart';

// ── Events ──────────────────────────────────────────────────────────────────
abstract class AuthEvent {}

class CheckAuthStatus extends AuthEvent {}

class StartPhoneAuthentication extends AuthEvent {
  final String phone;
  final String deviceId;
  final bool isLogin;
  StartPhoneAuthentication({required this.phone, required this.deviceId, required this.isLogin});
}

class VerifyOtpCode extends AuthEvent {
  final String phone;
  final String otp;
  final String deviceId;
  final bool isLogin;
  VerifyOtpCode({required this.phone, required this.otp, required this.deviceId, required this.isLogin});
}

class LogoutRequested extends AuthEvent {
  final String deviceId;
  LogoutRequested({required this.deviceId});
}

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
    on<CheckAuthStatus>((event, emit) async {
      emit(AuthLoading());
      // For onboarding flow checking can fallback to unauthenticated
      emit(Unauthenticated());
    });

    on<StartPhoneAuthentication>((event, emit) async {
      emit(AuthLoading());
      try {
        final result = await authRepository.startPhoneAuth(event.phone, event.deviceId, event.isLogin);
        if (result.success) {
          emit(AuthOtpSent());
        } else {
          emit(AuthError(message: result.error ?? 'Failed to request OTP. Try again.'));
        }
      } catch (e) {
        emit(AuthError(message: e.toString()));
      }
    });

    on<VerifyOtpCode>((event, emit) async {
      emit(AuthLoading());
      try {
        final driver = await authRepository.verifyPhoneOtp(event.phone, event.otp, event.deviceId, event.isLogin);
        emit(Authenticated(driver: driver));
      } catch (e) {
        emit(AuthError(message: e.toString()));
      }
    });

    on<LogoutRequested>((event, emit) async {
      emit(AuthLoading());
      try {
        await authRepository.logout(event.deviceId);
        emit(Unauthenticated());
      } catch (_) {
        emit(Unauthenticated());
      }
    });
  }
}
