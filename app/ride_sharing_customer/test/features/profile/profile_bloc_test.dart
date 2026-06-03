import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:ride_sharing_customer/features/profile/domain/repositories/profile_repository.dart';
import 'package:ride_sharing_customer/features/profile/presentation/bloc/profile_bloc.dart';

class MockProfileRepository implements ProfileRepository {
  Map<String, dynamic> mockProfile = {
    'name': 'Alex Morgan',
    'email': 'alex@example.com',
    'phone': '123456',
    'saved_places': [
      {'name': 'Home', 'address': '123 St', 'type': 'home'}
    ],
    'payment_methods': [
      {'id': 'pm_visa', 'type': 'credit_card', 'brand': 'Visa', 'last_4': '4242', 'is_default': true}
    ]
  };

  List<Map<String, dynamic>> mockHistory = [
    {
      'id': 'ride_1',
      'fare': 120.0,
      'status': 'completed',
    }
  ];

  @override
  Future<Map<String, dynamic>> getUserProfile() async {
    return mockProfile;
  }

  @override
  Future<void> updateUserProfile(String name, String email, String phone) async {
    mockProfile['name'] = name;
    mockProfile['email'] = email;
    mockProfile['phone'] = phone;
  }

  @override
  Future<List<Map<String, dynamic>>> getRideHistory() async {
    return mockHistory;
  }

  @override
  Future<void> updateSavedPlaces(List<Map<String, dynamic>> places) async {
    mockProfile['saved_places'] = places;
  }

  @override
  Future<void> updatePaymentMethods(List<Map<String, dynamic>> methods) async {
    mockProfile['payment_methods'] = methods;
  }
}

void main() {
  late MockProfileRepository repository;

  setUp(() {
    repository = MockProfileRepository();
  });

  group('ProfileBloc Tests', () {
    blocTest<ProfileBloc, ProfileState>(
      'emits [ProfileLoading, ProfileLoaded] when LoadProfile is added',
      build: () => ProfileBloc(repository),
      act: (bloc) => bloc.add(LoadProfile()),
      expect: () => [
        ProfileLoading(),
        isA<ProfileLoaded>(),
      ],
    );

    blocTest<ProfileBloc, ProfileState>(
      'emits updated ProfileLoaded state directly when UpdatePlaces is added on ProfileLoaded',
      build: () {
        final bloc = ProfileBloc(repository);
        bloc.emit(ProfileLoaded(userProfile: repository.mockProfile, rideHistory: repository.mockHistory));
        return bloc;
      },
      act: (bloc) => bloc.add(const UpdatePlaces([
        {'name': 'Gym', 'address': '456 St', 'type': 'favorite'}
      ])),
      expect: () => [
        isA<ProfileLoaded>().having(
          (state) => (state.userProfile['saved_places'] as List).first['name'],
          'saved places name',
          'Gym',
        ),
      ],
    );

    blocTest<ProfileBloc, ProfileState>(
      'emits updated ProfileLoaded state directly when UpdatePaymentMethods is added on ProfileLoaded',
      build: () {
        final bloc = ProfileBloc(repository);
        bloc.emit(ProfileLoaded(userProfile: repository.mockProfile, rideHistory: repository.mockHistory));
        return bloc;
      },
      act: (bloc) => bloc.add(const UpdatePaymentMethods([
        {'id': 'pm_mastercard', 'type': 'credit_card', 'brand': 'Mastercard', 'last_4': '1111', 'is_default': true}
      ])),
      expect: () => [
        isA<ProfileLoaded>().having(
          (state) => (state.userProfile['payment_methods'] as List).first['brand'],
          'payment method brand',
          'Mastercard',
        ),
      ],
    );
  });
}
