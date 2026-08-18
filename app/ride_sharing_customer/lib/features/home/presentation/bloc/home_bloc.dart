import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../domain/repositories/home_repository.dart';

// ==========================================
// Home Events
// ==========================================
abstract class HomeEvent extends Equatable {
  const HomeEvent();

  @override
  List<Object?> get props => [];
}

class LoadHomeData extends HomeEvent {}

class SearchPlacesQueryChanged extends HomeEvent {
  final String query;

  const SearchPlacesQueryChanged(this.query);

  @override
  List<Object?> get props => [query];
}

// ==========================================
// Home States
// ==========================================
abstract class HomeState extends Equatable {
  const HomeState();

  @override
  List<Object?> get props => [];
}

class HomeInitial extends HomeState {}

class HomeLoading extends HomeState {}

class HomeLoaded extends HomeState {
  final LatLng currentPosition;
  final List<Map<String, dynamic>> savedPlaces;
  final List<Map<String, dynamic>> searchResults;

  const HomeLoaded({
    required this.currentPosition,
    required this.savedPlaces,
    this.searchResults = const [],
  });

  HomeLoaded copyWith({
    LatLng? currentPosition,
    List<Map<String, dynamic>>? savedPlaces,
    List<Map<String, dynamic>>? searchResults,
  }) {
    return HomeLoaded(
      currentPosition: currentPosition ?? this.currentPosition,
      savedPlaces: savedPlaces ?? this.savedPlaces,
      searchResults: searchResults ?? this.searchResults,
    );
  }

  @override
  List<Object?> get props => [currentPosition, savedPlaces, searchResults];
}

class HomeError extends HomeState {
  final String message;

  const HomeError(this.message);

  @override
  List<Object?> get props => [message];
}

// ==========================================
// Home BLoC
// ==========================================
class HomeBloc extends Bloc<HomeEvent, HomeState> {
  final HomeRepository _homeRepository;

  HomeBloc(this._homeRepository) : super(HomeInitial()) {
    on<LoadHomeData>(_onLoadHomeData);
    on<SearchPlacesQueryChanged>(_onSearchPlacesQueryChanged);
  }

  Future<void> _onLoadHomeData(LoadHomeData event, Emitter<HomeState> emit) async {
    if (state is! HomeLoaded) {
      emit(HomeLoading());
    }
    try {
      final position = await _homeRepository.getCurrentLocation();
      final saved = await _homeRepository.getSavedPlaces();
      emit(HomeLoaded(currentPosition: position, savedPlaces: saved));
    } catch (e) {
      if (state is! HomeLoaded) {
        emit(HomeError(e.toString()));
      }
    }
  }

  Future<void> _onSearchPlacesQueryChanged(SearchPlacesQueryChanged event, Emitter<HomeState> emit) async {
    final currentState = state;
    if (currentState is HomeLoaded) {
      try {
        final results = await _homeRepository.searchPlaces(event.query);
        emit(currentState.copyWith(searchResults: results));
      } catch (_) {
        // Suppress search errors to preserve map state
      }
    }
  }
}
