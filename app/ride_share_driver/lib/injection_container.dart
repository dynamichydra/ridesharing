import 'package:get_it/get_it.dart';
import 'core/storage/secure_storage.dart';
import 'core/network/api_client.dart';
import 'data/datasources/auth_remote_datasource.dart';
import 'data/datasources/onboarding_remote_datasource.dart';
import 'data/repositories/auth_repository_impl.dart';
import 'data/repositories/onboarding_repository_impl.dart';
import 'domain/repositories/auth_repository.dart';
import 'domain/repositories/onboarding_repository.dart';
import 'presentation/bloc/auth/auth_bloc.dart';
import 'presentation/bloc/onboarding/onboarding_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // ── Core ──────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<SecureStorage>(() => SecureStorage());
  sl.registerLazySingleton<ApiClient>(() => ApiClient(secureStorage: sl()));

  // ── Data Sources ──────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRemoteDataSource>(
      () => AuthRemoteDataSource(apiClient: sl(), secureStorage: sl()));
  sl.registerLazySingleton<OnboardingRemoteDataSource>(
      () => OnboardingRemoteDataSource(apiClient: sl()));

  // ── Repositories ──────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRepository>(
      () => AuthRepositoryImpl(remoteDataSource: sl(), secureStorage: sl()));
  sl.registerLazySingleton<OnboardingRepository>(
      () => OnboardingRepositoryImpl(remoteDataSource: sl()));

  // ── BLoCs ─────────────────────────────────────────────────────────────────
  sl.registerFactory(() => AuthBloc(authRepository: sl()));
  sl.registerFactory(() => OnboardingBloc(onboardingRepository: sl()));
}
