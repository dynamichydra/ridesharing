import 'package:get_it/get_it.dart';
import 'core/storage/secure_storage.dart';
import 'core/network/api_client.dart';
import 'services/device_id_service.dart';
import 'services/location_service.dart';
import 'features/auth/data/datasources/auth_remote_datasource.dart';
import 'data/datasources/onboarding_remote_datasource.dart';
import 'features/dashboard/data/datasources/driver_status_remote_datasource.dart';
import 'features/subscription/data/datasources/subscription_remote_datasource.dart';
import 'features/ride/data/datasources/ride_remote_datasource.dart';
import 'features/ride/data/datasources/ride_socket_datasource.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'data/repositories/onboarding_repository_impl.dart';
import 'features/dashboard/data/repositories/driver_status_repository_impl.dart';
import 'features/subscription/data/repositories/subscription_repository_impl.dart';
import 'features/ride/data/repositories/ride_repository_impl.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'domain/repositories/onboarding_repository.dart';
import 'features/dashboard/domain/repositories/driver_status_repository.dart';
import 'features/subscription/domain/repositories/subscription_repository.dart';
import 'features/ride/domain/repositories/ride_repository.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'presentation/bloc/onboarding/onboarding_bloc.dart';
import 'features/dashboard/presentation/bloc/driver_status_bloc.dart';
import 'features/subscription/presentation/bloc/subscription_bloc.dart';
import 'features/ride/presentation/bloc/ride_bloc.dart';
import 'features/profile/data/datasources/profile_remote_datasource.dart';
import 'features/profile/presentation/bloc/profile_bloc.dart';
import 'features/wallet/data/datasources/wallet_remote_datasource.dart';
import 'features/wallet/presentation/bloc/wallet_bloc.dart';
import 'features/ride_history/data/datasources/ride_history_datasource.dart';
import 'features/ride_history/presentation/bloc/ride_history_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // ── Core ──────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<SecureStorage>(() => SecureStorage());
  sl.registerLazySingleton<ApiClient>(() => ApiClient(secureStorage: sl()));

  // ── Services ──────────────────────────────────────────────────────────────
  sl.registerLazySingleton<DeviceIdService>(() => DeviceIdService(secureStorage: sl()));
  sl.registerLazySingleton<LocationService>(() => LocationService());

  // ── Data Sources ──────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRemoteDataSource>(
      () => AuthRemoteDataSource(apiClient: sl(), deviceIdService: sl()));
  sl.registerLazySingleton<OnboardingRemoteDataSource>(
      () => OnboardingRemoteDataSource(apiClient: sl()));
  sl.registerLazySingleton<DriverStatusRemoteDataSource>(
      () => DriverStatusRemoteDataSource(apiClient: sl()));
  sl.registerLazySingleton<SubscriptionRemoteDataSource>(
      () => SubscriptionRemoteDataSource(apiClient: sl()));
  sl.registerLazySingleton<RideRemoteDataSource>(
      () => RideRemoteDataSource(apiClient: sl()));
  // Singleton: the socket connection + its broadcast streams must survive
  // across repeated connect()/disconnect() cycles (online/offline toggles),
  // not be recreated with every RideBloc instance.
  sl.registerLazySingleton<RideSocketDataSource>(
      () => RideSocketDataSource(secureStorage: sl()));
  sl.registerLazySingleton<ProfileRemoteDataSource>(
      () => ProfileRemoteDataSource(apiClient: sl()));
  sl.registerLazySingleton<WalletRemoteDataSource>(
      () => WalletRemoteDataSource(apiClient: sl()));
  sl.registerLazySingleton<RideHistoryDataSource>(
      () => RideHistoryDataSource(apiClient: sl()));

  // ── Repositories ──────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRepository>(
      () => AuthRepositoryImpl(remoteDataSource: sl(), secureStorage: sl()));
  sl.registerLazySingleton<OnboardingRepository>(
      () => OnboardingRepositoryImpl(remoteDataSource: sl()));
  sl.registerLazySingleton<DriverStatusRepository>(
      () => DriverStatusRepositoryImpl(remoteDataSource: sl()));
  sl.registerLazySingleton<SubscriptionRepository>(
      () => SubscriptionRepositoryImpl(remoteDataSource: sl()));
  sl.registerLazySingleton<RideRepository>(
      () => RideRepositoryImpl(remoteDataSource: sl(), socketDataSource: sl()));

  // ── BLoCs ─────────────────────────────────────────────────────────────────
  sl.registerFactory(() => AuthBloc(authRepository: sl()));
  sl.registerFactory(() => OnboardingBloc(onboardingRepository: sl()));
  sl.registerFactory(() => DriverStatusBloc(driverStatusRepository: sl(), locationService: sl(), secureStorage: sl()));
  sl.registerFactory(() => SubscriptionBloc(subscriptionRepository: sl()));
  sl.registerLazySingleton<RideBloc>(() => RideBloc(rideRepository: sl(), locationService: sl()));
  sl.registerFactory(() => ProfileBloc(dataSource: sl()));
  sl.registerFactory(() => WalletBloc(dataSource: sl()));
  sl.registerFactory(() => RideHistoryBloc(dataSource: sl()));
}
