const fs = require('fs');
const path = require('path');

// 1. profile_bloc.dart
let f = path.resolve('lib/features/profile/presentation/bloc/profile_bloc.dart');
let c = fs.readFileSync(f, 'utf8');
c = c.replace(
  `class UpdateProfileDetails extends ProfileEvent {
  final String name;
  final String email;
  final String phone;

  const UpdateProfileDetails({required this.name, required this.email, required this.phone});

  @override
  List<Object?> get props => [name, email, phone];
}`,
  `class UpdateProfileDetails extends ProfileEvent {
  final String name;
  final String email;
  final String phone;
  final String? currencyCode;

  const UpdateProfileDetails({required this.name, required this.email, required this.phone, this.currencyCode});

  @override
  List<Object?> get props => [name, email, phone, currencyCode];
}`
);
c = c.replace(
  `await _profileRepository.updateUserProfile(event.name, event.email, event.phone);`,
  `await _profileRepository.updateUserProfile(event.name, event.email, event.phone, currencyCode: event.currencyCode);`
);
fs.writeFileSync(f, c);

// 2. profile_repository.dart
f = path.resolve('lib/features/profile/domain/repositories/profile_repository.dart');
c = fs.readFileSync(f, 'utf8');
c = c.replace(
  `Future<void> updateUserProfile(String name, String email, String phone);`,
  `Future<void> updateUserProfile(String name, String email, String phone, {String? currencyCode});`
);
fs.writeFileSync(f, c);

// 3. profile_repository_impl.dart
f = path.resolve('lib/features/profile/data/repositories/profile_repository_impl.dart');
c = fs.readFileSync(f, 'utf8');
c = c.replace(
  `Future<void> updateUserProfile(String name, String email, String phone) async {
    await remoteDataSource.updateUserProfile(name, email, phone);
  }`,
  `Future<void> updateUserProfile(String name, String email, String phone, {String? currencyCode}) async {
    await remoteDataSource.updateUserProfile(name, email, phone, currencyCode: currencyCode);
  }`
);
fs.writeFileSync(f, c);

// 4. profile_datasource.dart
f = path.resolve('lib/features/profile/data/datasources/profile_datasource.dart');
c = fs.readFileSync(f, 'utf8');
c = c.replace(
  `Future<void> updateUserProfile(String name, String email, String phone) async {
    try {
      final response = await apiClient.dio.patch('/riders/profile', data: {
        'name': name,
        'email': email,
      });`,
  `Future<void> updateUserProfile(String name, String email, String phone, {String? currencyCode}) async {
    try {
      final response = await apiClient.dio.patch('/riders/profile', data: {
        'name': name,
        'email': email,
        if (currencyCode != null) 'currencyCode': currencyCode,
      });`
);
fs.writeFileSync(f, c);
