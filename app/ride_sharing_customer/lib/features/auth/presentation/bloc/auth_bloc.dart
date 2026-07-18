import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/auth_repository.dart';

// ==========================================
// Auth Events
// ==========================================
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AppStarted extends AuthEvent {}

class LoginSubmitted extends AuthEvent {
  final String phone;

  const LoginSubmitted(this.phone);

  @override
  List<Object?> get props => [phone];
}

class SignupSubmitted extends AuthEvent {
  final String name;
  final String email;
  final String phone;
  final String password;

  const SignupSubmitted({
    required this.name,
    required this.email,
    required this.phone,
    required this.password,
  });

  @override
  List<Object?> get props => [name, email, phone, password];
}

class OtpSubmitted extends AuthEvent {
  final String code;

  const OtpSubmitted(this.code);

  @override
  List<Object?> get props => [code];
}

class RegisterDetailsSubmitted extends AuthEvent {
  final String name;
  final String email;

  const RegisterDetailsSubmitted({required this.name, required this.email});

  @override
  List<Object?> get props => [name, email];
}

class ForgotPasswordSubmitted extends AuthEvent {
  final String email;

  const ForgotPasswordSubmitted(this.email);

  @override
  List<Object?> get props => [email];
}

class LoggedOut extends AuthEvent {}

// ==========================================
// Auth States
// ==========================================
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {}

class AuthUnauthenticated extends AuthState {}

class OtpRequired extends AuthState {
  final String phoneNumber;
  const OtpRequired(this.phoneNumber);

  @override
  List<Object?> get props => [phoneNumber];
}

class RegistrationDetailsRequired extends AuthState {}

class ForgotPasswordSuccess extends AuthState {}

class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}

// ==========================================
// Auth BLoC
// ==========================================
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc(this._authRepository) : super(AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoginSubmitted>(_onLoginSubmitted);
    on<SignupSubmitted>(_onSignupSubmitted);
    on<OtpSubmitted>(_onOtpSubmitted);
    on<RegisterDetailsSubmitted>(_onRegisterDetailsSubmitted);
    on<ForgotPasswordSubmitted>(_onForgotPasswordSubmitted);
    on<LoggedOut>(_onLoggedOut);
  }

  Future<void> _onAppStarted(AppStarted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final isLoggedIn = await _authRepository.checkAuthStatus();
      if (isLoggedIn) {
        emit(AuthAuthenticated());
      } else {
        emit(AuthUnauthenticated());
      }
    } catch (_) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginSubmitted(LoginSubmitted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _authRepository.login(event.phone);
      emit(OtpRequired(event.phone));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onSignupSubmitted(SignupSubmitted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _authRepository.login(event.phone);
      emit(OtpRequired(event.phone));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onOtpSubmitted(OtpSubmitted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final detailsRequired = await _authRepository.verifyOtp(event.code);
      if (detailsRequired) {
        emit(RegistrationDetailsRequired());
      } else {
        emit(AuthAuthenticated());
      }
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onRegisterDetailsSubmitted(RegisterDetailsSubmitted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _authRepository.registerProfileDetails(event.name, event.email);
      emit(AuthAuthenticated());
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onForgotPasswordSubmitted(ForgotPasswordSubmitted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _authRepository.sendForgotPasswordEmail(event.email);
      emit(ForgotPasswordSuccess());
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onLoggedOut(LoggedOut event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    await _authRepository.logout();
    emit(AuthUnauthenticated());
  }
}
