import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:ride_sharing_customer/features/auth/domain/repositories/auth_repository.dart';
import 'package:ride_sharing_customer/features/auth/presentation/bloc/auth_bloc.dart';

class MockAuthRepository implements AuthRepository {
  bool isLoggedIn = false;
  bool isNewUser = false;
  bool shouldFail = false;

  @override
  Future<bool> checkAuthStatus() async {
    if (shouldFail) throw Exception('Auth error');
    return isLoggedIn;
  }

  @override
  Future<void> login(String phone) async {
    if (shouldFail) throw Exception('Failed to send OTP');
  }

  @override
  Future<void> signup(String name, String email, String phone, String password) async {
    if (shouldFail) throw Exception('Failed to signup');
  }

  @override
  Future<bool> verifyOtp(String code) async {
    if (shouldFail) throw Exception('Invalid OTP');
    return isNewUser;
  }

  @override
  Future<void> registerProfileDetails(String name, String email) async {
    if (shouldFail) throw Exception('Failed profile registration');
  }

  @override
  Future<void> sendForgotPasswordEmail(String email) async {
    if (shouldFail) throw Exception('Failed email send');
  }

  @override
  Future<void> logout() async {}
}

void main() {
  late MockAuthRepository mockRepo;

  setUp(() {
    mockRepo = MockAuthRepository();
  });

  group('AuthBloc Tests', () {
    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthUnauthenticated] when AppStarted is added and user is not logged in',
      build: () => AuthBloc(mockRepo),
      act: (bloc) => bloc.add(AppStarted()),
      expect: () => [AuthLoading(), AuthUnauthenticated()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] when AppStarted is added and user is logged in',
      build: () {
        mockRepo.isLoggedIn = true;
        return AuthBloc(mockRepo);
      },
      act: (bloc) => bloc.add(AppStarted()),
      expect: () => [AuthLoading(), AuthAuthenticated()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, OtpRequired] when LoginSubmitted is added',
      build: () => AuthBloc(mockRepo),
      act: (bloc) => bloc.add(const LoginSubmitted('+919876543210')),
      expect: () => [AuthLoading(), const OtpRequired('+919876543210')],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] when OtpSubmitted is added and user profile is complete',
      build: () {
        mockRepo.isNewUser = false;
        return AuthBloc(mockRepo);
      },
      act: (bloc) => bloc.add(const OtpSubmitted('123456')),
      expect: () => [AuthLoading(), AuthAuthenticated()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, RegistrationDetailsRequired] when OtpSubmitted is added for new user',
      build: () {
        mockRepo.isNewUser = true;
        return AuthBloc(mockRepo);
      },
      act: (bloc) => bloc.add(const OtpSubmitted('123456')),
      expect: () => [AuthLoading(), RegistrationDetailsRequired()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] when RegisterDetailsSubmitted is added',
      build: () => AuthBloc(mockRepo),
      act: (bloc) => bloc.add(const RegisterDetailsSubmitted(name: 'John Doe', email: 'john@example.com')),
      expect: () => [AuthLoading(), AuthAuthenticated()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthUnauthenticated] when LoggedOut is added',
      build: () => AuthBloc(mockRepo),
      act: (bloc) => bloc.add(LoggedOut()),
      expect: () => [AuthLoading(), AuthUnauthenticated()],
    );
  });
}
