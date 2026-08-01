import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Core
import 'core/services/storage_service.dart';
import 'core/network/dio_client.dart';

// Auth
import 'features/auth/data/datasources/auth_datasource.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';

// Home
import 'features/home/data/datasources/home_datasource.dart';
import 'features/home/data/repositories/home_repository_impl.dart';
import 'features/home/domain/repositories/home_repository.dart';
import 'features/home/presentation/bloc/home_bloc.dart';

// Booking
import 'features/booking/data/datasources/booking_datasource.dart';
import 'features/booking/data/repositories/booking_repository_impl.dart';
import 'features/booking/domain/repositories/booking_repository.dart';
import 'features/booking/presentation/bloc/booking_bloc.dart';

// Ride Tracking
import 'features/ride_tracking/data/datasources/ride_tracking_socket_datasource.dart';
import 'features/ride_tracking/data/repositories/ride_tracking_repository_impl.dart';
import 'features/ride_tracking/domain/repositories/ride_tracking_repository.dart';
import 'features/ride_tracking/presentation/bloc/ride_tracking_bloc.dart';

// Wallet
import 'features/wallet/data/datasources/wallet_datasource.dart';
import 'features/wallet/data/repositories/wallet_repository_impl.dart';
import 'features/wallet/domain/repositories/wallet_repository.dart';
import 'features/wallet/presentation/bloc/wallet_bloc.dart';

// Notifications
import 'features/notifications/data/datasources/notifications_datasource.dart';
import 'features/notifications/data/repositories/notifications_repository_impl.dart';
import 'features/notifications/domain/repositories/notifications_repository.dart';
import 'features/notifications/presentation/bloc/notifications_bloc.dart';

// Profile
import 'features/profile/data/datasources/profile_datasource.dart';
import 'features/profile/data/repositories/profile_repository_impl.dart';
import 'features/profile/domain/repositories/profile_repository.dart';
import 'features/profile/presentation/bloc/profile_bloc.dart';
import 'core/theme/theme_bloc.dart';

final sl = GetIt.instance;


Future<void> init() async {
  // Core Services
  const secureStorage = FlutterSecureStorage();
  sl.registerSingleton<FlutterSecureStorage>(secureStorage);

  final storageService = StorageService(secureStorage);
  await storageService.init();
  sl.registerSingleton<StorageService>(storageService);

  final dio = Dio();
  sl.registerLazySingleton<Dio>(() => dio);
  sl.registerLazySingleton<DioClient>(() => DioClient(sl<Dio>()));

  // ==========================================
  // Auth Feature
  // ==========================================
  sl.registerLazySingleton<AuthDataSource>(() => AuthDataSourceImpl(sl<DioClient>(), sl<StorageService>()));
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl<AuthDataSource>()));
  sl.registerFactory(() => AuthBloc(sl<AuthRepository>()));

  // ==========================================
  // Home Feature
  // ==========================================
  sl.registerLazySingleton<HomeDataSource>(() => HomeDataSourceImpl(sl<DioClient>()));
  sl.registerLazySingleton<HomeRepository>(() => HomeRepositoryImpl(sl<HomeDataSource>()));
  sl.registerFactory(() => HomeBloc(sl<HomeRepository>()));

  // ==========================================
  // Booking Feature
  // ==========================================
  sl.registerLazySingleton<BookingDataSource>(() => BookingDataSourceImpl(sl<DioClient>()));
  sl.registerLazySingleton<BookingRepository>(() => BookingRepositoryImpl(sl<BookingDataSource>()));
  sl.registerFactory(() => BookingBloc(sl<BookingRepository>()));

  // ==========================================
  // Ride Tracking Feature
  // ==========================================
  sl.registerLazySingleton<RideTrackingSocketDataSource>(() => RideTrackingSocketDataSource(storageService: sl<StorageService>()));
  sl.registerLazySingleton<RideTrackingRepository>(() => RideTrackingRepositoryImpl(socketDataSource: sl<RideTrackingSocketDataSource>()));
  sl.registerFactory(() => RideTrackingBloc(sl<RideTrackingRepository>()));

  // ==========================================
  // Wallet Feature
  // ==========================================
  sl.registerLazySingleton<WalletDataSource>(() => WalletDataSourceImpl(sl<DioClient>(), sl<StorageService>()));
  sl.registerLazySingleton<WalletRepository>(() => WalletRepositoryImpl(sl<WalletDataSource>()));
  sl.registerFactory(() => WalletBloc(sl<WalletRepository>()));

  // ==========================================
  // Notifications Feature
  // ==========================================
  sl.registerLazySingleton<NotificationsDataSource>(() => NotificationsDataSourceImpl(sl<DioClient>(), sl<StorageService>()));
  sl.registerLazySingleton<NotificationsRepository>(() => NotificationsRepositoryImpl(sl<NotificationsDataSource>()));
  sl.registerFactory(() => NotificationsBloc(sl<NotificationsRepository>()));

  // ==========================================
  // Profile Feature
  // ==========================================
  sl.registerLazySingleton<ProfileDataSource>(() => ProfileDataSourceImpl(sl<DioClient>(), sl<StorageService>()));
  sl.registerLazySingleton<ProfileRepository>(() => ProfileRepositoryImpl(sl<ProfileDataSource>()));
  sl.registerFactory(() => ProfileBloc(sl<ProfileRepository>()));
  sl.registerFactory(() => ThemeBloc(sl<StorageService>()));
}
